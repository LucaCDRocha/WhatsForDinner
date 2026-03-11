// API communication functions

/**
 * Get prompts for scenario generation (from WhatsForDinnerSimple)
 */
function getScenarioPrompts(playerCount) {
	const systemPrompt = {
		role: "system",
		content: `You are a family scenario generator. You MUST respond in this EXACT format (no other text):

GENERAL_CONTEXT: [20-35 words describing the overall family situation]
SITUATION: [15-25 words describing the immediate challenge]
QUESTION: [Under 10 words asking how family will handle it]
INFLATION: [number from 0-100 representing stress level]
ROLES:
[Name1]: [Role] ([age]) - [10-20 words about their perspective]
[Name2]: [Role] ([age]) - [10-20 words about their perspective]
[Name3]: [Role] ([age]) - [10-20 words about their perspective]
[Name4]: [Role] ([age]) - [10-20 words about their perspective]

IMPORTANT: Start IMMEDIATELY with "GENERAL_CONTEXT:" - no introduction or explanation.

Example:
GENERAL_CONTEXT: The Johnson family just got home after a long day. Everyone is tired and hungry, but the fridge is half-empty and nobody planned ahead for dinner.
SITUATION: It's dinner time and nobody has decided what to cook. The fridge has some ingredients but nothing prepared.
QUESTION: What's for dinner tonight?
INFLATION: 15
ROLES:
Sarah: Mom (42) - Just finished a work deadline and wants something quick but healthy for the family.
Jake: Teenager (15) - Has basketball practice in 2 hours and needs energy, but hates vegetables.
Mike: Dad (45) - Offered to cook but admits he's only good at grilling and ordering takeout.
Emma: Youngest child (10) - Picky eater who only likes pasta and chicken nuggets.

Guidelines:
- Use realistic family roles: Mom, Dad, Teenager, Oldest child, Youngest child, Grandparent, etc.
- Use realistic ages: adults 25-70, teenagers 13-19, children 5-12, grandparents 60-80
- Mix simple everyday scenarios (stress 5-20) with more urgent situations (stress 40-70)
- Keep initial INFLATION low to leave room for gameplay
- Each role situation should show that character's unique perspective, constraints, or feelings`,
	};

	const userPrompt = {
		role: "user",
		content: `Generate a family scenario with ${playerCount} family members. Use realistic names (Sarah, Mike, Emma, Jake, Alex, Sophie, etc.). Start your response with "GENERAL_CONTEXT:"`,
	};

	return [systemPrompt, userPrompt];
}

/**
 * Get prompts for harmony analysis (from WhatsForDinnerSimple)
 */
function getHarmonyAnalysisPrompts(scenario, question, tension, responses) {
	const systemPrompt = {
		role: "system",
		content: `You are analyzing family coordination in a stressful situation. Each family member has an assigned role and age (shown in parentheses, e.g., "Mom (42)" or "Teenager (15)"). Check if responses show good teamwork (which reduces tension) or conflict/confusion (which increases tension). Pay attention to how family members interact based on their roles and ages (e.g., Mom coordinating with Dad, teenagers helping appropriately for their age, younger children being supervised, etc.). Consider age-appropriate responses and capabilities.

You'll see the current question being asked and the family's responses. If there is conversation history from previous rounds, use it to understand the context and how the family has been coordinating.

After analyzing harmony, generate the NEXT challenge or question they need to address (under 10 words) that:
- Flows naturally from what just happened
- Matches the tension level after your action
- If tension will be low (0-30): simple follow-up tasks
- If tension will be moderate (30-60): complications or related decisions
- If tension will be high (60-90): urgent complications or conflicts to resolve

Respond with ONLY this format:
Harmony: [YES/NO]
Score: [0-100] (100 = perfect teamwork, 0 = total conflict)
Reason: [One short sentence why]
Action: [INFLATE/DEFLATE] by [0-30]
NEXT_QUESTION: [Your next question here]

DEFLATE when: Family shows clear coordination, agreement on roles, good communication, mutual support, age-appropriate tasks.
INFLATE when: Responses show conflict, confusion, everyone doing the same thing, no clear plan, blame, age-inappropriate expectations.

Be strict - only say YES if responses show clear coordination and agreement on who does what.`,
	};

	const userPrompt = {
		role: "user",
		content: `Scenario: ${scenario}\n\nQuestion: ${question}\n\nCurrent Tension: ${tension}\n\nResponses:\n${responses}`,
	};

	return [systemPrompt, userPrompt];
}
