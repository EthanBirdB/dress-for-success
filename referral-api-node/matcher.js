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
  if (!client || !booking.description || !staff.bio) return null;

  try {
    const prompt = `You are a matching assistant for a charity dress service.
Booking description: "${booking.description}"
Staff/volunteer bio: "${staff.bio}"

Rate how well this staff member's expertise matches this booking's needs.
Reply with ONLY a decimal number between 0.0 and 1.0. No explanation.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 5,
      temperature: 0,
    });

    const text = response.choices[0]?.message?.content?.trim() || '0';
    const score = parseFloat(text);
    return isNaN(score) ? null : Math.min(1, Math.max(0, score));
  } catch (err) {
    console.warn('OpenAI scoring failed, falling back to tag-only:', err.message);
    return null;
  }
}

async function rankCandidates(booking, allStaff) {
  const available = allStaff.filter(s => s.isActive !== false && isAvailable(s, booking));

  const results = await Promise.all(
    available.map(async (staff) => {
      const { score: tScore, matchingTraits } = tagScore(staff, booking);
      let aScore = null;

      // Use AI for bookings with descriptions or when tag score is low
      if (booking.description || tScore < 0.5) {
        aScore = await aiScore(staff, booking);
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
        finalScore: Math.round(finalScore * 100) / 100,
        matchingTraits,
      };
    })
  );

  return results.sort((a, b) => b.finalScore - a.finalScore);
}

module.exports = { rankCandidates };
