require('dotenv').config();
const OpenAI = require('openai');

let openaiClient = null;
function getOpenAI() {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function isAvailable(staff, booking) {
  // Location filter: staff with locations set only serve those locations
  const staffLocs = staff.locations || (staff.location ? [staff.location] : []);
  if (staffLocs.length > 0 && booking.location && !staffLocs.includes(booking.location)) return false;

  if (!booking.scheduledDate || !staff.availability) return true;
  const dow = DAY_NAMES[new Date(booking.scheduledDate + 'T12:00:00').getDay()];
  const days = staff.availability.days || [];
  if (days.length > 0 && !days.includes(dow)) return false;

  if (booking.scheduledTime && staff.availability.startTime && staff.availability.endTime) {
    if (booking.scheduledTime < staff.availability.startTime) return false;
    if (booking.scheduledTime > staff.availability.endTime) return false;
  }
  return true;
}

function tagScore(staff, booking) {
  if (!booking.characteristics || booking.characteristics.length === 0) return 0;
  const staffTraits = new Set(staff.traits || []);
  const matches = booking.characteristics.filter(c => staffTraits.has(c));
  return {
    score: matches.length / booking.characteristics.length,
    matchingTraits: matches,
  };
}

async function aiScore(staff, booking) {
  const client = getOpenAI();
  if (!client) return null;

  try {
    const descPart = booking.description
      ? `Client description: "${booking.description}"`
      : `Client needs (traits): ${(booking.characteristics || []).join(', ')}`;
    const bioPart = staff.bio
      ? `Staff bio: "${staff.bio}"`
      : `Staff skills: ${(staff.traits || []).join(', ')}`;

    const prompt = `You are an empathetic AI matching assistant for "Dress for Success", a charity that empowers women through professional styling for life-changing moments — job interviews, court appearances, weddings, and career re-entry.

${descPart}
${bioPart}
Staff traits: ${(staff.traits || []).join(', ')}

Your job: score the match AND write a warm, specific, human insight about WHY this person is the right fit for this client right now.
The reason should feel personal and meaningful — reference the client's specific situation and the staff member's unique strengths. Make it sound like something a thoughtful coordinator would say, not a generic algorithm.

Reply ONLY in this exact format (no extra text):
<score>|<reason>
Where score is 0.0–1.0 and reason is one vivid, specific sentence (max 25 words).
Example: 0.91|Emma's decade of bridal styling and her gift for calming nervous clients makes her the perfect guide for this wedding journey.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 120,
      temperature: 0.4,
    });

    const text = response.choices[0]?.message?.content?.trim() || '0';
    const pipeIdx = text.indexOf('|');
    const score = parseFloat(pipeIdx >= 0 ? text.slice(0, pipeIdx) : text);
    const reason = pipeIdx >= 0 ? text.slice(pipeIdx + 1).trim() : null;
    return {
      score: isNaN(score) ? null : Math.min(1, Math.max(0, score)),
      reason: reason || null,
    };
  } catch (err) {
    console.warn('OpenAI scoring failed, falling back to tag-only:', err.message);
    return null;
  }
}

async function rankCandidates(booking, allStaff) {
  const available = allStaff.filter(s => s.isActive !== false && isAvailable(s, booking));

  // Stage 1: score everyone by tags only (no API calls)
  const tagRanked = available.map(staff => {
    const { score: tScore, matchingTraits } = tagScore(staff, booking);
    return { staff, tScore, matchingTraits };
  }).sort((a, b) => b.tScore - a.tScore);

  // Stage 2: only call AI for the top 3 by tag score to avoid quota exhaustion
  const AI_LIMIT = 3;
  const results = await Promise.all(
    tagRanked.map(async ({ staff, tScore, matchingTraits }, idx) => {
      let aScore = null;
      let aiReason = null;

      if (idx < AI_LIMIT) {
        const aiResult = await aiScore(staff, booking);
        if (aiResult) {
          aScore = aiResult.score;
          aiReason = aiResult.reason;
        }
      }

      const finalScore = aScore !== null
        ? 0.6 * tScore + 0.4 * aScore
        : tScore;

      return {
        staffId: staff.id,
        name: staff.name,
        type: staff.type,
        traits: staff.traits || [],
        bio: staff.bio || '',
        availability: staff.availability,
        tagScore: Math.round(tScore * 100) / 100,
        aiScore: aScore !== null ? Math.round(aScore * 100) / 100 : null,
        aiReason,
        finalScore: Math.round(finalScore * 100) / 100,
        matchingTraits,
      };
    })
  );

  return results.sort((a, b) => b.finalScore - a.finalScore);
}

module.exports = { rankCandidates };
