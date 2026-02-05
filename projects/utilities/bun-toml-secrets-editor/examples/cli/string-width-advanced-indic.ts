#!/usr/bin/env bun
// examples/string-width-advanced-indic.ts - Advanced Indic script examples with GB9c support

/**
 * Advanced examples demonstrating Bun.stringWidth() with comprehensive
 * Indic script support including complex conjuncts, ligatures, and
 * regional variations across major Indian languages.
 */

console.log("🌏 Advanced Indic Scripts - Comprehensive GB9c Examples");
console.log("=".repeat(70));

// Complex Devanagari examples
console.log("\n📝 Complex Devanagari Conjuncts and Ligatures:");

const complexDevanagari = [
	{
		text: "क्षत्रिय",
		description: "Kshatriya (warrior class)",
		type: "conjunct",
	},
	{ text: "ज्ञान", description: "Jnana (knowledge)", type: "conjunct" },
	{ text: "त्रिपुरा", description: "Tripura (city)", type: "conjunct" },
	{ text: "स्वागत", description: "Swagat (welcome)", type: "conjunct" },
	{ text: "द्वार", description: "Dwara (door)", type: "conjunct" },
	{ text: "प्रकाश", description: "Prakasha (light)", type: "conjunct" },
	{ text: "ब्रह्म", description: "Brahma (creator)", type: "conjunct" },
	{ text: "श्रीमती", description: "Srimati (Mrs.)", type: "conjunct" },
	{ text: "ग्राम", description: "Gram (village)", type: "conjunct" },
	{ text: "द्रव्य", description: "Dravya (substance)", type: "conjunct" },
];

complexDevanagari.forEach((example, index) => {
	const width = Bun.stringWidth(example.text);
	const codePoints = Array.from(example.text)
		.map(
			(c) =>
				c.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0") || "0000",
		)
		.join(" ");

	console.log(
		`${(index + 1).toString().padStart(2)}. ${example.description.padEnd(25)} [${example.type}]`,
	);
	console.log(`   "${example.text}" | Width: ${width} | ${codePoints}`);
});

// Regional language variations
console.log("\n🌍 Regional Language Variations:");

const regionalExamples = [
	// Hindi (Devanagari)
	{ language: "Hindi", text: "भारत", english: "India", script: "Devanagari" },
	{
		language: "Hindi",
		text: "स्वतंत्रता",
		english: "Freedom",
		script: "Devanagari",
	},
	{ language: "Hindi", text: "प्रेम", english: "Love", script: "Devanagari" },

	// Bengali
	{ language: "Bengali", text: "ভারত", english: "India", script: "Bengali" },
	{
		language: "Bengali",
		text: "স্বাধীনতা",
		english: "Freedom",
		script: "Bengali",
	},
	{ language: "Bengali", text: "প্রেম", english: "Love", script: "Bengali" },

	// Gujarati
	{ language: "Gujarati", text: "ભારત", english: "India", script: "Gujarati" },
	{
		language: "Gujarati",
		text: "સ્વતંત્રતા",
		english: "Freedom",
		script: "Gujarati",
	},
	{ language: "Gujarati", text: "પ્રેમ", english: "Love", script: "Gujarati" },

	// Punjabi (Gurmukhi)
	{ language: "Punjabi", text: "ਭਾਰਤ", english: "India", script: "Gurmukhi" },
	{
		language: "Punjabi",
		text: "ਆਜ਼ਾਦੀ",
		english: "Freedom",
		script: "Gurmukhi",
	},
	{ language: "Punjabi", text: "ਪਿਆਰ", english: "Love", script: "Gurmukhi" },

	// Tamil
	{ language: "Tamil", text: "இந்தியா", english: "India", script: "Tamil" },
	{ language: "Tamil", text: "சுதந்திரம்", english: "Freedom", script: "Tamil" },
	{ language: "Tamil", text: "காதல்", english: "Love", script: "Tamil" },

	// Telugu
	{ language: "Telugu", text: "భారత్", english: "India", script: "Telugu" },
	{
		language: "Telugu",
		text: "స్వాతంత్ర్యం",
		english: "Freedom",
		script: "Telugu",
	},
	{ language: "Telugu", text: "ప్రేమ", english: "Love", script: "Telugu" },

	// Kannada
	{ language: "Kannada", text: "ಭಾರತ", english: "India", script: "Kannada" },
	{
		language: "Kannada",
		text: "ಸ್ವಾತಂತ್ರ್ಯ",
		english: "Freedom",
		script: "Kannada",
	},
	{ language: "Kannada", text: "ಪ್ರೇಮ", english: "Love", script: "Kannada" },

	// Malayalam
	{
		language: "Malayalam",
		text: "ഇന്ത്യ",
		english: "India",
		script: "Malayalam",
	},
	{
		language: "Malayalam",
		text: "സ്വാതന്ത്ര്യം",
		english: "Freedom",
		script: "Malayalam",
	},
	{
		language: "Malayalam",
		text: "പ്രണയം",
		english: "Love",
		script: "Malayalam",
	},

	// Odia
	{ language: "Odia", text: "ଭାରତ", english: "India", script: "Odia" },
	{ language: "Odia", text: "ସ୍ୱାଧୀନତା", english: "Freedom", script: "Odia" },
	{ language: "Odia", text: "ପ୍ରେମ", english: "Love", script: "Odia" },
];

regionalExamples.forEach((example, index) => {
	const width = Bun.stringWidth(example.text);
	console.log(
		`${(index + 1).toString().padStart(2)}. ${example.language.padEnd(8)} (${example.script.padEnd(9)})`,
	);
	console.log(`   "${example.text}" = "${example.english}" | Width: ${width}`);
});

// Numbers and digits in different scripts
console.log("\n🔢 Numbers and Digits in Indic Scripts:");

const numberExamples = [
	{ script: "Devanagari", numbers: "०१२३४५६७८९", english: "0123456789" },
	{ script: "Bengali", numbers: "০১২৩৪৫৬৭৮৯", english: "0123456789" },
	{ script: "Gujarati", numbers: "૦૧૨૩૪૫૬૭૮૯", english: "0123456789" },
	{ script: "Gurmukhi", numbers: "੦੧੨੩੪੫੬੭੮੯", english: "0123456789" },
	{ script: "Tamil", numbers: "௦௧௨௩௪௫௬௭௮௯", english: "0123456789" },
	{ script: "Telugu", numbers: "౦౧౨౩౪౫౬౭౮౯", english: "0123456789" },
	{ script: "Kannada", numbers: "೦೧೨೩೪೫೬೭೮೯", english: "0123456789" },
	{ script: "Malayalam", numbers: "൦൧൨൩൪൫൬൭൮൯", english: "0123456789" },
	{ script: "Odia", numbers: "୦୧୨୩୪୫୬୭୮୯", english: "0123456789" },
];

numberExamples.forEach((example, index) => {
	const indicWidth = Bun.stringWidth(example.numbers);
	const latinWidth = Bun.stringWidth(example.english);

	console.log(
		`${(index + 1).toString().padStart(2)}. ${example.script.padEnd(10)} | Width: ${indicWidth} vs ${latinWidth}`,
	);
	console.log(`   "${example.numbers}" vs "${example.english}"`);
});

// Complex words with multiple conjuncts
console.log("\n🔗 Complex Words with Multiple Conjuncts:");

const complexWords = [
	{
		language: "Sanskrit",
		text: "संस्कृतम्",
		meaning: "Sanskrit",
		breakdown: "saṃskṛtam",
	},
	{
		language: "Hindi",
		text: "स्वतंत्रता",
		meaning: "Freedom",
		breakdown: "svatantrā",
	},
	{
		language: "Bengali",
		text: "স্বাধীনতা",
		meaning: "Freedom",
		breakdown: "svādhīnatā",
	},
	{
		language: "Gujarati",
		text: "સ્વતંત્રતા",
		meaning: "Freedom",
		breakdown: "svatantrā",
	},
	{
		language: "Telugu",
		text: "స్వాతంత్ర్యం",
		meaning: "Freedom",
		breakdown: "svātantryaṁ",
	},
	{
		language: "Kannada",
		text: "ಸ್ವಾತಂತ್ರ್ಯ",
		meaning: "Freedom",
		breakdown: "svātantra",
	},
	{
		language: "Malayalam",
		text: "സ്വാതന്ത്ര്യം",
		meaning: "Freedom",
		breakdown: "svātantryaṁ",
	},
];

complexWords.forEach((example, index) => {
	const width = Bun.stringWidth(example.text);
	const conjunctCount = (
		example.text.match(/[\u094D\u09CD\u0ACD\u0A4D\u0BBE\u0C4D\u0CCD\u0D4D]/g) ||
		[]
	).length;

	console.log(
		`${(index + 1).toString().padStart(2)}. ${example.language.padEnd(10)}: "${example.meaning}"`,
	);
	console.log(
		`   "${example.text}" | Width: ${width} | Conjuncts: ${conjunctCount} | ${example.breakdown}`,
	);
});

// Mixed script examples (common in modern usage)
console.log("\n🌐 Mixed Script Examples (Modern Usage):");

const mixedScriptExamples = [
	{ text: "India भारत 🇮🇳", description: "Country name in English and Hindi" },
	{
		text: "COVID-19 कोविड-१९",
		description: "COVID-19 in English and Hindi numbers",
	},
	{ text: "Rs. १०००/-", description: "Rupees symbol with Hindi numbers" },
	{ text: "www.bharat.in भारत", description: "Website with Hindi translation" },
	{ text: "2024 साल", description: "Year in English and Hindi" },
	{ text: "App ऐप्प", description: "App in English and Hindi transliteration" },
	{ text: "Email ईमेल", description: "Email in English and Hindi" },
	{ text: "Phone फोन 📱", description: "Phone with emoji" },
];

mixedScriptExamples.forEach((example, index) => {
	const width = Bun.stringWidth(example.text);
	const scripts = detectScripts(example.text);

	console.log(
		`${(index + 1).toString().padStart(2)}. ${example.description.padEnd(35)}`,
	);
	console.log(
		`   "${example.text}" | Width: ${width} | Scripts: ${scripts.join(", ")}`,
	);
});

// Emoji and Indic text combinations
console.log("\n😀 Emoji and Indic Text Combinations:");

const emojiExamples = [
	{ text: "🇮🇳 भारत", description: "India flag with Hindi name" },
	{ text: "🙏 नमस्ते", description: "Prayer hands with Hindi greeting" },
	{ text: "💰 रुपया", description: "Money with Hindi currency word" },
	{ text: "📚 शिक्षा", description: "Books with Hindi education word" },
	{ text: "🏠 घर", description: "House with Hindi home word" },
	{ text: "❤️ प्यार", description: "Heart with Hindi love word" },
	{ text: "🌟 तारा", description: "Star with Hindi star word" },
	{ text: "🍛 खाना", description: "Food with Hindi food word" },
];

emojiExamples.forEach((example, index) => {
	const width = Bun.stringWidth(example.text);
	const emojiCount = (example.text.match(/[\p{Emoji}]/gu) || []).length;
	const indicCount = (
		example.text.match(
			/[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]/g,
		) || []
	).length;

	console.log(
		`${(index + 1).toString().padStart(2)}. ${example.description.padEnd(25)}`,
	);
	console.log(
		`   "${example.text}" | Width: ${width} | Emoji: ${emojiCount} | Indic: ${indicCount}`,
	);
});

// Performance stress test with complex Indic text
console.log("\n⚡ Performance Stress Test with Complex Indic Text:");

const stressTestTexts = [
	"संस्कृतम् देवनागरी लिपि में जटिल संयुक्ताक्षरों के साथ",
	"বাংলা ভাষায় জটিল যুক্তবর্ণ এবং উচ্চারণ",
	"ગુજરાતી ભાષામાં જટિલ સંયુક્તાક્ષરો અને ઉચ્ચારણ",
	"ਪੰਜਾਬੀ ਭਾਸ਼ਾ ਵਿੱਚ ਗੁੰਝਵੇਂ ਅੱਖਰ ਅਤੇ ਉਚਾਰਨ",
	"தமிழ் மொழியில் சிக்கலான எழுத்துக்கள் மற்றும் உச்சரிப்பு",
	"తెలుగు భాషలో క్లిష్టమైన అక్షరాలు మరియు ఉచ్చారణ",
];

const performanceTest = () => {
	const iterations = 10000;
	const start = performance.now();

	for (let i = 0; i < iterations; i++) {
		stressTestTexts.forEach((text) => {
			Bun.stringWidth(text);
		});
	}

	const end = performance.now();
	const time = end - start;
	const totalCalls = iterations * stressTestTexts.length;

	console.log(
		`   Processed ${totalCalls.toLocaleString()} complex Indic text calculations`,
	);
	console.log(`   Time: ${time.toFixed(2)}ms`);
	console.log(
		`   Average: ${((time / totalCalls) * 1000).toFixed(3)}μs per call`,
	);
	console.log(
		`   Performance: ${((totalCalls / time) * 1000).toFixed(0)} calls/second`,
	);
};

performanceTest();

// Helper function to detect scripts in mixed text
function detectScripts(text: string) {
	const scripts = [];

	if (/[\u0900-\u097F]/.test(text)) scripts.push("Devanagari");
	if (/[\u0980-\u09FF]/.test(text)) scripts.push("Bengali");
	if (/[\u0A00-\u0A7F]/.test(text)) scripts.push("Gurmukhi");
	if (/[\u0A80-\u0AFF]/.test(text)) scripts.push("Gujarati");
	if (/[\u0B00-\u0B7F]/.test(text)) scripts.push("Odia");
	if (/[\u0B80-\u0BFF]/.test(text)) scripts.push("Tamil");
	if (/[\u0C00-\u0C7F]/.test(text)) scripts.push("Telugu");
	if (/[\u0C80-\u0CFF]/.test(text)) scripts.push("Kannada");
	if (/[\u0D00-\u0D7F]/.test(text)) scripts.push("Malayalam");
	if (/[a-zA-Z]/.test(text)) scripts.push("Latin");
	if (
		/[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]/.test(
			text,
		) &&
		scripts.length === 0
	) {
		scripts.push("Indic");
	}

	return scripts.length > 0 ? scripts : ["Unknown"];
}

// Practical application examples
console.log("\n💼 Practical Application Examples:");

const practicalExamples = [
	{
		title: "CLI Menu with Indic Text",
		demo: () => {
			const menu = [
				"1. भाषा चुनें (Select Language)",
				"2. सेटिंग्स (Settings)",
				"3. सहायता (Help)",
				"4. बाहर निकलें (Exit)",
			];

			console.log("   CLI Menu:");
			menu.forEach((item) => {
				const width = Bun.stringWidth(item);
				console.log(`   ${item.padEnd(40)} | Width: ${width}`);
			});
		},
	},
	{
		title: "Form Labels with Indic Text",
		demo: () => {
			const formFields = [
				"नाम (Name):",
				"पता (Address):",
				"शहर (City):",
				"देश (Country):",
			];

			console.log("   Form Labels:");
			formFields.forEach((field) => {
				const width = Bun.stringWidth(field);
				console.log(`   ${field.padEnd(25)} | Width: ${width}`);
			});
		},
	},
	{
		title: "Status Messages with Indic Text",
		demo: () => {
			const statuses = [
				"✅ सफलतापूर्वक पूर्ण (Completed Successfully)",
				"⚠️  चेतावनी (Warning)",
				"❌ त्रुटि (Error)",
				"🔄 प्रक्रिया में (In Progress)",
			];

			console.log("   Status Messages:");
			statuses.forEach((status) => {
				const width = Bun.stringWidth(status);
				console.log(`   ${status.padEnd(50)} | Width: ${width}`);
			});
		},
	},
];

practicalExamples.forEach((example, index) => {
	console.log(`\n   ${index + 1}. ${example.title}:`);
	example.demo();
});

console.log("\n🎉 Advanced Indic Script Examples Complete!");
console.log(
	"   • Comprehensive script coverage across 9 major Indic languages",
);
console.log("   • Complex conjuncts and ligatures properly handled");
console.log("   • Mixed script and emoji combinations supported");
console.log("   • Performance optimized for real-world applications");
console.log("   • Practical examples for CLI, forms, and user interfaces");
