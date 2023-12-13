import type { StemResult } from "./stemmer/stemmer";
import type { PlainRule, RegexRule, Rule, InputMethodEditor } from "../core"
import { Arab } from "../arab-common"
import { prepareRules,
         chainRule,
         ruleProduct,
         makeTransitive,
         transliterate,
         debugTransliterate,
         escape,
         isPlain,
         wordDelimitingPatterns,
         asWordBeginning,
         asWordEnding,
         asNotWordBeginning,
         asNotWordEnding,
         asSingleWord,
         asInverse
       } from "../core"

const enum Pegon {
    Alif = "\u0627",
    AlifWithHamzaAbove = "\u0623",
    AlifWithHamzaBelow = "\u0625",
    AlifWithMaddaAbove = "\u0622",
    AlifWithHamzaAboveThenWaw = "\u0623\u0648",
    AlifWithHamzaBelowThenYa = "\u0625\u064A",
    AlifWithHamzaAboveThenYa = "\u0623\u064A",
    AlifThenWaw = "\u0627\u0648",
    // Tambahan untuk huruf Arab
    AlifWasla = "\u0671",
    WawHamzaAbove= "\u0624",

    // Harakat
    Fatha = "\u064E",
    CurlyFatha = "\u08E4",
    MaddaAbove = "\u0653",
    SuperscriptAlif = "\u0670", // khanjariah
    Kasra = "\u0650",
    Damma = "\u064F",
    // Tambahan harakat untuk huruf Arab
    Fathatan = "\u064B",
    Dhammatan = "\u064C",
    Kasratan = "\u064D",
    InvertedDhamma = "\u0657",
    SubAlif = "\u0656",
    OpenFathatan = "\u08F0",
    OpenDhammatan = "\u08F1",
    OpenKasratan= "\u08F2",

    SuperscriptAlifThenYa = "\u0670\u064A",
    FathaThenYa = "\u064E\u064A",
    FathaThenWaw = "\u064E\u0648",
    // Consonants
    Ba = "\u0628",
    Ya = "\u064A",
    Ta = "\u062A",
    Ca = "\u0686",
    Dal = "\u062F",
    Waw = "\u0648",
    Ra = "\u0631",
    Zain = "\u0632",
    Sin = "\u0633",
    Ain = "\u0639",
    Jim = "\u062C",
    Fa = "\u0641",
    Qaf = "\u0642",
    Peh = "\u06A4",
    Kaf = "\u0643",
    KafWithOneDotBelow = "\u08B4",
    KafWithThreeDotsBelow = "\u06AE",
    Lam = "\u0644",
    Mim = "\u0645",
    Nun = "\u0646",
    Ha = "\u0647",
    ThaWithThreeDotsAbove = "\u069F",
    ThaWithOneDotBelow = "\u0637\u065C",
    Tsa = "\u062B",
    Ho = "\u062D",
    Kho = "\u062E",
    DalWithOneDotBelow = "\u068A",
    DalWithThreeDotsBelow = "\u08AE",
    DalWithThreeDotsAbove = "\u068E",
    Dzal = "\u0630",
    Syin = "\u0634",
    Shod = "\u0635",
    Dho = "\u0636",
    Tha = "\u0637",
    Zha = "\u0638",
    Ghain = "\u063A",
    Nga = "\u06A0",
    Nya = "\u06D1",
    FathaThenWawThenKasra = "\u064E\u0648\u0650",
    FathaThenYaThenKasra = "\u064E\u064A\u0650",
    TaMarbuta = "\u0629",
    YaWithHamzaAbove = "\u0678",
    FathaThenYaWithHamzaAbove = "\u064E\u0678",
    Maksura = "\u0649",
    Comma = "\u060C",
    Sukun = "\u0652",
    Sukun2 = "\u06E1",
    Tatwil = "\u0640",
    // Tambahan consonant Arab
    Hamza = "\u0621",
    //Tambahan
    Pepet = "\u08e4",
}

const tatwilRules: PlainRule[] = [
    ["-0-", Pegon.Tatwil]
]

const punctuationRules: PlainRule[] = [
    ["-0-,", Pegon.Comma]
]
const marbutahRules: PlainRule[] = [
    ["-1-t_", Pegon.TaMarbuta]
]

const sukunRules: PlainRule[] = [
    ["-2-.", Pegon.Sukun],
    ["-2-^.", Pegon.Sukun2]
]

const pepetRules: PlainRule[] = [
    ["-3-^e", Pegon.Pepet],
    ["-3-^e", Pegon.AlifWithMaddaAbove]
]

const monographVowelRules: PlainRule[] = [
    ["-4-a", Pegon.Alif],
    // asumsi semua e tanpa diakritik taling
	["-4-e", Pegon.Fatha + Pegon.Ya],
	["-4-o", Pegon.Fatha + Pegon.Waw],
	["-4-i", Pegon.Ya],
	["-4-u", Pegon.Waw],
    //second options of rules 4, 5, 6
    ["-4-W", Pegon.Waw],
    ["-4-A", Pegon.Alif],
    ["-4-Y", Pegon.Ya],
]

const digraphVowelRules: PlainRule[] = [
    ["-5-^e", Pegon.Alif + Pegon.Pepet],
    ["-5-^e", Pegon.MaddaAbove],
    ["-5-^e", Pegon.YaWithHamzaAbove],
    ["-5-`a", Pegon.YaWithHamzaAbove + Pegon.Alif],
    ["-5-`U", Pegon.WawHamzaAbove + Pegon.Damma],
]

const monographVowelHarakatAtFirstAbjadRules: PlainRule[] = [
    ["-6-A", Pegon.Alif],
    ["-6-e", Pegon.Ya + Pegon.Fatha + Pegon.Sukun],
    ["-6-o", Pegon.Waw + Pegon.Fatha + Pegon.Sukun],
    ["-6-i", Pegon.Ya + Pegon.Kasra + Pegon.Sukun],
    ["-6-u", Pegon.Waw + Pegon.Damma + Pegon.Sukun],    
]

const vowelStartedWithIRules: PlainRule[] = [
    ["-6x-ia", Pegon.Ya + Pegon.Ya + Pegon.Alif],
    ["-6x-i'a", Pegon.Ya + Pegon.YaWithHamzaAbove + Pegon.Alif],
    ["-6x-iYa", Pegon.Kasra + Pegon.Ya + Pegon.Alif],
    ["-6x-i'a", Pegon.Kasra + Pegon.YaWithHamzaAbove + Pegon.Alif],
]
    
const singleVowelRules: PlainRule[] =
    chainRule(
        digraphVowelRules,
        monographVowelHarakatAtFirstAbjadRules)

const singleEndingVowelRules: PlainRule[] = [
    ["-7-i", Pegon.Ya]
]

const singleVowelAsWordEndingRules: RegexRule[] =
    asWordEnding(singleEndingVowelRules);

const longEndingWawYaMaksuraRules: PlainRule[] = [
    ["-8-uW", Pegon.Damma + Pegon.Waw],
    ["-8-iY", Pegon.Kasra + Pegon.Ya],
    ["-8-i^Y", Pegon.Kasra + Pegon.Maksura]
]

const beginningDigraphVowelRules: PlainRule[] = [
    ["-9-^e", Pegon.Alif + Pegon.MaddaAbove],
    ["-9-A", Pegon.AlifWithHamzaAbove + Pegon.Fatha ],
]

const beginningMonographVowelRules: PlainRule[] = [
    ["-10-e", Pegon.Alif + Pegon.Fatha + Pegon.Ya],
    ["-10-i", Pegon.Alif + Pegon.Ya ],
    ["-10-o", Pegon.Alif + Pegon.Fatha + Pegon.Waw],
    ["-10-u", Pegon.Alif + Pegon.Waw],
    ["-10-a", Pegon.AlifWithHamzaAbove],
]

const beginningSingleVowelRules: PlainRule[] =
    chainRule(
        beginningDigraphVowelRules,
        beginningMonographVowelRules)

const beginningIForDeadConsonantRules: PlainRule[] = [
    ["-11-i", Pegon.AlifWithHamzaBelow + Pegon.Kasra],
    ["-11-i", Pegon.AlifWithHamzaBelow],
]

const beginningIForOpenConsonantRules: PlainRule[] = [
    ["-12-i", Pegon.Alif + Pegon.Ya]
]

const doubleDigraphVowelRules: PlainRule[] = [
    ["-13-a^e", Pegon.Alif +
        Pegon.YaWithHamzaAbove + Pegon.MaddaAbove],
    ["-13-i^e", Pegon.Ya + 
        Pegon.YaWithHamzaAbove + Pegon.MaddaAbove],
    ["-13-u^e", Pegon.Waw +
        Pegon.YaWithHamzaAbove + Pegon.MaddaAbove],
    ["-13-e^e", Pegon.Fatha + Pegon.Ya +
        Pegon.YaWithHamzaAbove + Pegon.MaddaAbove],
    ["-13-o^e", Pegon.Fatha + Pegon.Waw +
        Pegon.YaWithHamzaAbove + Pegon.MaddaAbove],

]

const doubleMonographVowelRulesStandard: PlainRule[] = [
    ["-14-ae", Pegon.Alif +
        Pegon.Ha +
        Pegon.Fatha + Pegon.Ya],
    ["-14-a`e", Pegon.Alif +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Ya],
    ["-14-ai", Pegon.Alif +
        Pegon.Ha +
        Pegon.Ya],
    ["-14-a`i", Pegon.Alif +
        Pegon.YaWithHamzaAbove +
        Pegon.Ya],
    ["-14-au", Pegon.Alif +
        Pegon.Ha +
        Pegon.Waw],
    ["-14-aU", Pegon.Alif +
        Pegon.Alif +
        Pegon.Waw],
    ["-14-iu", Pegon.Ya +
        Pegon.Ya +
        Pegon.Waw],
    ["-14-i`u", Pegon.Ya +
        Pegon.YaWithHamzaAbove +
        Pegon.Waw],
    ["-14-Ya", Pegon.Ya +
        Pegon.Ya + Pegon.Alif],
    ["-14-Y`a", Pegon.Ya +
        Pegon.YaWithHamzaAbove + Pegon.Alif],
    ["-14-aa", 
        Pegon.Alif + 
        Pegon.AlifWithHamzaAbove + Pegon.Fatha],
    ["-14-aa", 
        Pegon.Alif + 
        Pegon.AlifWithHamzaAbove], 
    ["-14-aa", 
        Pegon.Alif + 
        Pegon.AlifWithHamzaAbove + Pegon.Fatha],
    ["-14-aa", 
        Pegon.Alif + 
        Pegon.AlifWithHamzaAbove],
    ["-14-ao", Pegon.Alif +
        Pegon.Ha +
        Pegon.Fatha + Pegon.Waw],
    ["-14-aO", Pegon.Alif +
        Pegon.Alif +
        Pegon.Fatha + Pegon.Waw],
    ["-14-eo", Pegon.Fatha + Pegon.Ya +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Waw],
    ["-14-io", Pegon.Ya +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Waw],
]

const doubleMonographVowelRulesSunda: PlainRule[] = [
    ...doubleMonographVowelRulesStandard,
    // Pegon Sunda
    ["-15-e_u", Pegon.MaddaAbove +
        Pegon.Waw],
    ["-15-a_i", Pegon.Fatha +
        Pegon.Ya +
        Pegon.Sukun],
    ["-15-a_u", Pegon.Fatha +
        Pegon.Waw +
        Pegon.Sukun],
]
// TODO
var doubleMonographVowelRules: PlainRule[] = [];

const initiateDoubleMonographVowelRules = (lang: string) => {
    if(lang === "Sunda"){
        doubleMonographVowelRules = doubleMonographVowelRulesSunda;
    } else {
        doubleMonographVowelRules = doubleMonographVowelRulesStandard;
    }
}

const doubleMonographBeginningSyllableVowelRules: PlainRule[] = [
    ["-16-iu",Pegon.Ya +
        Pegon.Ya +
        Pegon.Waw],
    ["-16-ia", Pegon.Ya +
        Pegon.Alif],
    // ["-16-eo", Pegon.Fatha +
    //     Pegon.Damma + Pegon.Waw + Pegon.Sukun],
    ["-16-ia", Pegon.Kasra +
        Pegon.Ya +
        Pegon.Fatha + Pegon.Alif],
    ["-16-eo", Pegon.Fatha + Pegon.Ya +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Waw],
    ["-16-io", Pegon.Ya +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Waw],    
]

const alternateDoubleMonographVowelRules: PlainRule[] = [
    ["-17-ae", Pegon.Fatha + Pegon.Alif +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Ya + Pegon.Sukun],
    ["-17-ai", Pegon.Alif +
        Pegon.YaWithHamzaAbove +
        Pegon.Ya],
    ["-17-au", Pegon.Alif +
        Pegon.Alif +
        Pegon.Waw],
    ["-17-iu", Pegon.Ya +
        Pegon.YaWithHamzaAbove +
        Pegon.Waw],
    ["-17-ia", Pegon.Kasra + Pegon.Ya + Pegon.Sukun + Pegon.Sukun +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Alif],
    ["-17-ao", Pegon.Alif +
        Pegon.Ha +
        Pegon.Fatha + Pegon.Waw],
    ["-17-aO", Pegon.Alif +
        Pegon.Alif +
        Pegon.Fatha + Pegon.Waw],
]

const alternateDoubleMonographBeginningSyllableVowelRules: PlainRule[] = [
    ["-18-iu", Pegon.Kasra +
        Pegon.YaWithHamzaAbove +
        Pegon.Damma + Pegon.Waw + Pegon.Sukun],
    ["-18-ia", Pegon.Kasra +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Alif],
]

const doubleVowelRules: PlainRule[] =
    chainRule(
        doubleDigraphVowelRules,
        doubleMonographVowelRules)

const doubleEndingVowelRules: PlainRule[] = [
    ["-19-ae", Pegon.Alif +
        Pegon.Ha +
        Pegon.Fatha + Pegon.Ya],
    ["-19-ai", Pegon.Alif +
        Pegon.Ha +
        Pegon.Ya],
    ["-19-ea", Pegon.Fatha + Pegon.Ya + Pegon.Sukun +
        Pegon.Ya +
        Pegon.Fatha + Pegon.Alif],
    ["-19-^ea", Pegon.Fatha + Pegon.Ya +
        Pegon.Ya +
        Pegon.Alif],
    ["-19-aa", Pegon.Alif +
        Pegon.Ha +
        Pegon.Alif],
    ["-19-oa", Pegon.Fatha + Pegon.Waw +
        Pegon.Ha +
        Pegon.Alif],
    ["-19-ua", Pegon.Waw +
        Pegon.Waw +
        Pegon.Alif],
    ["-19-ia", Pegon.Ya + 
        Pegon.Ya +
        Pegon.Alif],
    ["-19-uWa", Pegon.Damma + Pegon.Waw+ Pegon.Alif]
]

const alternateDoubleEndingVowelRules: PlainRule[] = [
    ["-20-ae", Pegon.Fatha + Pegon.Alif +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Maksura + Pegon.Sukun],
    ["-20-ai", Pegon.Fatha + Pegon.Alif +
        Pegon.YaWithHamzaAbove +
        Pegon.Kasra + Pegon.Maksura + Pegon.Sukun],
]

const doubleVowelAsWordEndingRules: RegexRule [] =
    asWordEnding(doubleEndingVowelRules);

const beginningSingleVowelAsWordBeginningRules: RegexRule[] =
    asWordBeginning(beginningSingleVowelRules);

const monographConsonantRules: PlainRule[] = [
    ["-21-b", Pegon.Ba],
    ["-21-t", Pegon.Ta],
    ["-21-c", Pegon.Ca],
    ["-21-d", Pegon.Dal],
    ["-21-r", Pegon.Ra],
    ["-21-z", Pegon.Zain],
    ["-21-s", Pegon.Sin],
    ["-21-'", Pegon.Ain],
    ["-21-j", Pegon.Jim],
    ["-21-f", Pegon.Fa],
    ["-21-q", Pegon.Qaf],
    ["-21-p", Pegon.Peh],
    ["-21-v", Pegon.Peh],
    ["-21-k", Pegon.Kaf],
    ["-21-G", Pegon.KafWithOneDotBelow],
    ["-21-g", Pegon.KafWithThreeDotsBelow],
    ["-21-l", Pegon.Lam],
    ["-21-m", Pegon.Mim],
    ["-21-n", Pegon.Nun],
    ["-21-h", Pegon.Ha],
    ["-21-w", Pegon.Waw],
    ["-21-y", Pegon.Ya],
    // Tambahan konsonan Arab
    ["-21-'`", Pegon.Hamza]
]

const digraphConsonantRules: PlainRule[] = [
    // special combination using diacritics, may drop
    // ["-22-t_h", Pegon.ThaWithOneDotBelow],
    // the one in id.wikipedia/wiki/Abjad_Pegon
    ["-22-t_h", Pegon.ThaWithThreeDotsAbove],
    ["-22-t_s", Pegon.Tsa],
    ["-22-h_h", Pegon.Ho],
    ["-22-k_h", Pegon.Kho],
    ["-22-d_H", Pegon.DalWithOneDotBelow],
    ["-22-d_h", Pegon.DalWithThreeDotsBelow],
    ["-22-d_h", Pegon.DalWithThreeDotsAbove],
    ["-22-d_z", Pegon.Dzal],
    ["-22-s_y", Pegon.Syin],
    ["-22-s_h", Pegon.Shod],
    ["-22-d_H", Pegon.Dho],
    ["-22-t_t", Pegon.Tha],
    ["-22-z_h", Pegon.Zha],
    ["-22-g_h", Pegon.Ghain],
    ["-22-n_g", Pegon.Nga],
    ["-22-n_y", Pegon.Nya],
];

const consonantRules: PlainRule[] = chainRule(
    digraphConsonantRules,
    monographConsonantRules)

const withSukun = (rules: PlainRule[]): PlainRule[] =>
    rules.map<PlainRule>(([key, val]) => [key, val.concat(Pegon.Sukun)])

const deadDigraphConsonantRules: PlainRule[] =
    digraphConsonantRules

const deadMonographConsonantRules: PlainRule[] =
    monographConsonantRules

const deadConsonantRules: PlainRule[] = consonantRules

// TODO
const ruleProductDoubleConsonant = (
    leftRules: PlainRule[],
    rightRules: PlainRule[],
  ): PlainRule[] =>
    leftRules.flatMap<PlainRule>(([leftKey, leftVal]) =>
      rightRules.map<PlainRule>(([rightKey, rightVal]) => [
        leftKey.concat('a'.concat(rightKey)),
        leftVal.concat(rightVal),
      ]),
    );
const doubleMonographConsonantRules: PlainRule[] = 
    ruleProductDoubleConsonant(consonantRules, consonantRules)

const singleVowelSyllableRules: PlainRule[] =
    chainRule(
        ruleProduct(consonantRules, digraphVowelRules),
        ruleProduct(consonantRules, monographVowelRules))

const doubleVowelSyllableRules: PlainRule[] =
    ruleProduct(consonantRules, doubleVowelRules)

const beginningIWithDeadConsonantRules: PlainRule[] =
    chainRule(
        ruleProduct(beginningIForDeadConsonantRules, deadDigraphConsonantRules),
        ruleProduct(beginningIForOpenConsonantRules, deadMonographConsonantRules))

const beginningIWithDeadConsonantAsWordBeginningRules: RegexRule[] =
    asWordBeginning(beginningIWithDeadConsonantRules)

const beginningIWithOpenConsonantRules: PlainRule[] =
    chainRule(
        ruleProduct(beginningIForOpenConsonantRules, doubleVowelSyllableRules),
        ruleProduct(beginningIForOpenConsonantRules, singleVowelSyllableRules))

const beginningIWithOpenConsonantAsSingleWordRules: Rule[] =
    // avoids the nesting problem
    chainRule(
        // single ending vowel
        asSingleWord(ruleProduct(ruleProduct(beginningIForOpenConsonantRules,
                                             consonantRules),
                                 singleEndingVowelRules)),
        // double ending vowel
        asSingleWord(ruleProduct(ruleProduct(beginningIForOpenConsonantRules,
                                             consonantRules),
                                 doubleEndingVowelRules)))

const singleVowelSyllableAsWordEndingRules: RegexRule[] =
    asWordEnding(ruleProduct(consonantRules, singleEndingVowelRules))

const doubleVowelSyllableAsWordEndingRules: RegexRule[] = 
    asWordEnding(ruleProduct(consonantRules, doubleEndingVowelRules))

const beginningIWithOpenConsonantAsWordBeginningRules: Rule[] =
    chainRule(
        beginningIWithOpenConsonantAsSingleWordRules,
        asWordBeginning(beginningIWithOpenConsonantRules))

const prefixRules: PlainRule[] = [
    ["-23-dak", Pegon.Dal + Pegon.Fatha + Pegon.Alif + Pegon.Kaf + Pegon.Sukun],
    ["-23-di", Pegon.Dal + Pegon.Kasra + Pegon.Ya + Pegon.Sukun]
]

const specialPrepositionRules: PlainRule[] = [
    ["-24-di", Pegon.Dal + Pegon.Kasra + Pegon.Maksura + Pegon.Sukun]
]

const prefixWithSpaceRules: PlainRule[] =
    prefixRules.map(([key, val]) => [key, val.concat(" ")])

const specialRaWithMaddaAboveRules: PlainRule[] = [
    ["-25-r^e", Pegon.Ra + Pegon.Fatha + Pegon.Ya]
]

const specialPrepositionAsSingleWordsRule: RegexRule[] =
    asSingleWord(specialPrepositionRules)

const prefixWithBeginningVowelRules: PlainRule[] =
    ruleProduct(prefixWithSpaceRules,
                beginningSingleVowelRules)

const prefixWithBeginningVowelAsWordBeginningRules: RegexRule[] =
    asWordBeginning(prefixWithBeginningVowelRules)

const prefixAsWordBeginningRules: RegexRule[] = asWordBeginning(prefixRules)

const latinConsonants: string[] = consonantRules.map<string>(([key, val]) => key)
const pegonConsonants: string[] = consonantRules.map<string>(([key, val]) => val)
const latinVowels: string[] = singleVowelRules.map<string>(([key, val]) => key)

const consonantExceptions: string[] = []

const asWordBeginningFollowedByOpenConsonant =
    (rules: PlainRule[]): RegexRule[] =>
    rules.map(([key, val]) =>
            [new RegExp(`(^|[${wordDelimitingPatterns}])(${key})($latinConsonants.join("|")($latinVowels.join("|")`),
             `$1${val}$2$3`])

const doubleMonographVowelBeginningSyllableRules: PlainRule[] =
    ruleProduct(consonantRules,
                doubleMonographBeginningSyllableVowelRules)

const alternateDoubleMonographVowelBeginningSyllableRules: PlainRule[] =
    ruleProduct(consonantRules,
                alternateDoubleMonographBeginningSyllableVowelRules)

const doubleMonographVowelAsBeginningSyllableRules: RegexRule[] =
    asWordBeginning(doubleMonographVowelBeginningSyllableRules)

const aWithFatha: PlainRule[] = [
    ["-26-a", Pegon.Fatha],
]   

const closedSyllable = (rules: PlainRule[]): RegexRule[] =>
    prepareRules(rules).map<RegexRule>(([key, val]) =>
        [new RegExp(`(${key})(?![_aiueo^\`WAIUEOY])`), `${val}`])

const closedSyllableWithSoundARules: RegexRule[] =
    closedSyllable(ruleProduct(ruleProduct(consonantRules,aWithFatha), consonantRules))


const indonesianPrefixesRules: PlainRule[] = [
    ["-27-di", Pegon.Dal + Pegon.Ya],
    ["-27-k^e", Pegon.Kaf + Pegon.MaddaAbove],
    ["-27-s^e", Pegon.Sin + Pegon.MaddaAbove],
    ["-27-b^er", Pegon.Ba + Pegon.MaddaAbove + Pegon.Ra],
    ["-27-b^e", Pegon.Ba + Pegon.MaddaAbove],
    ["-27-t^er", Pegon.Ta + Pegon.MaddaAbove + Pegon.Ra],
    ["-27-t^e", Pegon.Ta + Pegon.MaddaAbove],
    ["-27-m^em", Pegon.Mim + Pegon.MaddaAbove + Pegon.Mim],
    ["-27-m^en_g", Pegon.Mim + Pegon.MaddaAbove + Pegon.Nga],
    ["-27-m^en", Pegon.Mim + Pegon.MaddaAbove + Pegon.Nun],
    ["-27-m^e", Pegon.Mim + Pegon.MaddaAbove],
    ["-27-p^er", Pegon.Peh + Pegon.MaddaAbove + Pegon.Ra],
    ["-27-p^em", Pegon.Peh + Pegon.MaddaAbove + Pegon.Mim],
    ["-27-p^en_g", Pegon.Peh + Pegon.MaddaAbove + Pegon.Nga],
    ["-27-p^en", Pegon.Peh + Pegon.MaddaAbove + Pegon.Nun],
    ["-27-p^e", Pegon.Peh + Pegon.MaddaAbove],
]

const transliterateIndonesianPrefixes =
    (prefix: string): string =>
        transliterate(prefix, prepareRules(indonesianPrefixesRules));

const indonesianSuffixes: PlainRule[] = [
    ["-28-ku", Pegon.Kaf + Pegon.Waw],
    ["-28-mu", Pegon.Mim + Pegon.Waw],
    ["-28-n_ya", Pegon.Nya + Pegon.Alif],
    ["-28-lah", Pegon.Lam + Pegon.Fatha + Pegon.Ha],
    ["-28-kah", Pegon.Kaf + Pegon.Fatha + Pegon.Ha],
    ["-28-tah", Pegon.Ta + Pegon.Fatha + Pegon.Ha],
    ["-28-pun", Pegon.Peh + Pegon.Waw + Pegon.Nun],
    ["-28-kan", Pegon.Kaf + Pegon.Fatha + Pegon.Nun],
]
const suffixAnForBaseWordWithEndingA: PlainRule[] = [
    ["-29-an", Pegon.AlifWithHamzaAbove + Pegon.Nun],
]

const suffixAn: PlainRule[] = [
    ["-30-an", Pegon.Alif + Pegon.Nun],
]

const indonesianSuffixesForBaseWordWithEndingA: PlainRule[] =
    chainRule(indonesianSuffixes, 
        suffixAnForBaseWordWithEndingA)

const indonesianSuffixesForRegularBaseWord: PlainRule[] =
    chainRule(indonesianSuffixes, 
        suffixAn)

const indonesianSuffixesWithAn: PlainRule[] = 
    chainRule(indonesianSuffixes, suffixAn, suffixAnForBaseWordWithEndingA)

const transliterateIndonesianSuffixes =
    (suffix: string, baseWord: string) => 
        baseWord[baseWord.length-1] === 'a' ?
        transliterate(suffix, prepareRules(indonesianSuffixesForBaseWordWithEndingA)) :
        transliterate(suffix, prepareRules(indonesianSuffixesForRegularBaseWord));

const transliterateISuffix = (baseWord: string) => {
        if (baseWord[baseWord.length-1] === 'a')
            return Pegon.Ha + Pegon.Ya
        else if (baseWord[baseWord.length-1].match(/^[iueo]/))
            return Pegon.Alif + Pegon.Ya
        else
            return Pegon.Ya
}



const baseWordLastLetterVowel: PlainRule[] = [
    ["-31-a", ""],
    ["-31-i", ""],
    ["-31-u", ""],
    ["-31-e", ""],
    ["-31-o", ""],
    ["-31-W", ""],
    ["-31-A", ""],
    ["-31-Y", ""],
]

const suffixFirstLetterVowel: PlainRule[] = [
    ["-32-a", Pegon.Alif],
    ["-32-i", Pegon.Ya],
    ["-32-e", Pegon.Alif + Pegon.Fatha + Pegon.Ya],
]

const doubleVowelForSuffixRules: PlainRule [] = [
    ["-33-ae", Pegon.Ha + Pegon.Fatha + Pegon.Ya],
    ["-33-ai", Pegon.Ha + Pegon.Ya],
    ["-33-Ya", Pegon.Ya + Pegon.Alif],
    ["-33-aa", Pegon.AlifWithHamzaAbove],
]

const baseWordLastLetterVowelSuffixFirstLetterVowel: PlainRule[] = 
    chainRule(doubleVowelForSuffixRules,
        ruleProduct(baseWordLastLetterVowel, suffixFirstLetterVowel))

const doubleEndingVowelForSuffixRules: PlainRule[] = [
    ["-34-ae", Pegon.Ha + Pegon.Fatha + Pegon.Ya],
    ["-34-ai", Pegon.Ha + Pegon.Ya],
    ["-34-ea", Pegon.Ya + Pegon.Fatha + Pegon.Alif],
    ["-34-^ea", Pegon.Ya + Pegon.Ya + Pegon.Alif],
    ["-34-aa", Pegon.Ha + Pegon.Alif],
    ["-34-oa", Pegon.Ha + Pegon.Alif],
    ["-34-ua", Pegon.Waw + Pegon.Alif],
    ["-34-ia", Pegon.Ya + Pegon.Alif],
]

const jawaPrefixesRules: PlainRule[] = [
    ["-35-di", Pegon.Dal + Pegon.Ya],
    ["-35-su", Pegon.Sin + Pegon.Waw],
    ["-35-pri", Pegon.Peh + Pegon.Ra + Pegon.Ya],
    ["-35-wi", Pegon.Waw + Pegon.Ya],
    ["-35-k^e", Pegon.Kaf + Pegon.MaddaAbove],
    ["-35-sa", Pegon.Sin + Pegon.Fatha],
    ["-35-dak", Pegon.Dal + Pegon.Fatha + Pegon.Kaf],
    ["-35-da", Pegon.Dal + Pegon.Fatha],
    ["-35-tar", Pegon.Ta + Pegon.Fatha + Pegon.Ra],
    ["-35-tak", Pegon.Ta + Pegon.Fatha + Pegon.Kaf],
    ["-35-ta", Pegon.Ta + Pegon.Fatha],
    ["-35-kok", Pegon.Kaf + Pegon.Fatha + Pegon.Waw + Pegon.Kaf],
    ["-35-ko", Pegon.Kaf + Pegon.Fatha + Pegon.Waw],
    ["-35-tok", Pegon.Ta + Pegon.Fatha + Pegon.Waw + Pegon.Kaf],
    ["-35-to", Pegon.Ta + Pegon.Fatha + Pegon.Waw],
    ["-35-pi", Pegon.Peh + Pegon.Ya],
    ["-35-kami", Pegon.Kaf + Pegon.Fatha + Pegon.Mim + Pegon.Ya],
    ["-35-kapi", Pegon.Kaf + Pegon.Fatha + Pegon.Peh + Pegon.Ya],
    ["-35-kuma", Pegon.Kaf + Pegon.Waw + Pegon.Mim + Pegon.Fatha],
    ["-35-ka", Pegon.Kaf + Pegon.Fatha],
    ["-35-pra", Pegon.Peh + Pegon.Ra + Pegon.Fatha],
    ["-35-pan_g", Pegon.Peh + Pegon.Fatha + Pegon.Nga],
    ["-35-pan", Pegon.Peh + Pegon.Fatha + Pegon.Nun],
    ["-35-pam", Pegon.Peh + Pegon.Fatha + Pegon.Mim],
    ["-35-pa", Pegon.Peh + Pegon.Fatha],
    ["-35-man_g", Pegon.Mim + Pegon.Fatha + Pegon.Nga],
    ["-35-man", Pegon.Mim + Pegon.Fatha + Pegon.Nun],
    ["-35-mam", Pegon.Mim + Pegon.Fatha + Pegon.Mim],
    ["-35-ma", Pegon.Mim + Pegon.Fatha],
    ["-35-m^en_g", Pegon.Mim + Pegon.MaddaAbove + Pegon.Nga],
    ["-35-m^en", Pegon.Mim + Pegon.MaddaAbove + Pegon.Nun],
    ["-35-m^em", Pegon.Mim + Pegon.MaddaAbove + Pegon.Mim],
    ["-35-m^e", Pegon.Mim + Pegon.MaddaAbove],
    ["-35-an_g", Pegon.Ha + Pegon.Fatha + Pegon.Nga],
    ["-35-am", Pegon.Ha + Pegon.Fatha + Pegon.Mim],
    ["-35-an", Pegon.Ha + Pegon.Fatha + Pegon.Nun],
    ["-35-a", Pegon.Ha + Pegon.Fatha],
]

const jawaSuffixesRules: PlainRule[] = [
    ["-36-i", Pegon.Ya],
    ["-36-ake", Pegon.Alif + Pegon.Kaf + Pegon.Fatha + Pegon.Ya],
    ["-36-en", Pegon.Fatha + Pegon.Ya + Pegon.Nun],
    ["-36-na", Pegon.Nun + Pegon.Alif],
    ["-36-ana", Pegon.Alif + Pegon.Nun + Pegon.Alif],
    ["-36-an", Pegon.Alif + Pegon.Nun],
    ["-36-e", Pegon.Fatha + Pegon.Ya],
    ["-36-a", Pegon.Alif],
]

const transliterateJawaPrefixes =
    (prefix: string): string =>
        transliterate(prefix, prepareRules(jawaPrefixesRules));

const transliterateJawaSuffixesVowel = (suffix: string, baseWord: string): string => {
    const jawaSuffixesRulesAlt: PlainRule[] = [
        ["-37-na", Pegon.Nun + Pegon.Alif],
        ["-37-ke", Pegon.Kaf + Pegon.Fatha + Pegon.Ya],
        ["-37-n", Pegon.Nun],
    ]

    const jawaSuffixesVowelRules: Rule[] =
            prepareRules(chainRule(
                ruleProduct(baseWordLastLetterVowelSuffixFirstLetterVowel, jawaSuffixesRulesAlt),
                doubleEndingVowelForSuffixRules,
                baseWordLastLetterVowelSuffixFirstLetterVowel))


    return transliterate(baseWord[baseWord.length-1]+suffix, jawaSuffixesVowelRules)
}

const transliterateJawaSuffixes = (suffix: string, baseWord: string): string => {
    if (baseWord[baseWord.length-1].match(/^[aiueoWAY]/) && suffix[0].match(/^[aiueo]/)) {
        return transliterateJawaSuffixesVowel(suffix, baseWord)
    }

    return transliterate(suffix, prepareRules(jawaSuffixesRules))
}

const transliterateIndonesianAffixes = (affixes: string[], baseWord: string): string[] => {
    let prefixResult = ''
    let suffixResult = ''

    for (let affix of affixes){
        let prefixMatches = affix.match(/(.*)-$/)
        let suffixMatches = affix.match(/^-(.*)/)

        if (prefixMatches) {
            prefixResult += transliterateIndonesianPrefixes(prefixMatches[1])
        }

        else if (suffixMatches) {
            if (suffixMatches[1] === 'i')
                suffixResult += transliterateISuffix(baseWord)
            else
                suffixResult += transliterateIndonesianSuffixes(suffixMatches[1], baseWord)
        }
    }

    return [prefixResult, suffixResult]
}

const transliterateJawaAffixes = (affixes: string[], baseWord: string): string[] => {
    let prefixResult = ''
    let suffixResult = ''

    for (let affix of affixes){
        let prefixMatches = affix.match(/(.*)-$/)
        let suffixMatches = affix.match(/^-(.*)/)

        if (prefixMatches) {
            prefixResult += transliterateJawaPrefixes(prefixMatches[1])
        }

        else if (suffixMatches) {
            suffixResult += transliterateJawaSuffixes(suffixMatches[1], baseWord)
        }
    }

    return [prefixResult, suffixResult]
}

const firstSyllableWithSoundA: RegexRule[] =
    asWordBeginning(ruleProduct(consonantRules, aWithFatha));

const countSyllable = (word: string): number => {
    const matches = word.match(/(e_u|a_i|a_u|\^e|`[aiueoAIUEO]|[aiueoAIUEO]){1}/g)
    if (matches)
        return matches.length
    return 0
}

const numbers : PlainRule[] = [
    ["0", Arab.Shifr],
    ["1", Arab.Wahid],
    ["2", Arab.Itsnan],
    ["3", Arab.Tsalatsah],
    ["4", Arab.Arbaah],
    ["5", Arab.Khamsah],
    ["6", Arab.Sittah],
    ["7", Arab.Sabaah],
    ["8", Arab.Tsamaniyah],
    ["9", Arab.Tisah]
]

const latinToPegonScheme: Rule[] =
    prepareRules(chainRule(
        longEndingWawYaMaksuraRules,
        specialPrepositionAsSingleWordsRule,
        specialRaWithMaddaAboveRules,
        closedSyllableWithSoundARules,
        prefixWithBeginningVowelAsWordBeginningRules,
        
        doubleVowelSyllableAsWordEndingRules,
        
        doubleMonographVowelAsBeginningSyllableRules,
        
        beginningIWithOpenConsonantAsWordBeginningRules,
        beginningIWithDeadConsonantAsWordBeginningRules,


        beginningSingleVowelAsWordBeginningRules,

        singleVowelSyllableAsWordEndingRules,
        doubleVowelSyllableRules,
        singleVowelSyllableRules,
        
        singleVowelRules,
        deadConsonantRules,
        marbutahRules,
        punctuationRules,
        sukunRules,
        pepetRules,
        numbers))

const latinToPegonSchemeForMoreThanTwoSyllables: Rule[] =
    prepareRules(chainRule(
        longEndingWawYaMaksuraRules,
        specialPrepositionAsSingleWordsRule,
        specialRaWithMaddaAboveRules,
        closedSyllableWithSoundARules,
        prefixWithBeginningVowelAsWordBeginningRules,
        
        doubleVowelSyllableAsWordEndingRules,

        doubleMonographVowelAsBeginningSyllableRules,
        
        beginningIWithOpenConsonantAsWordBeginningRules,
        beginningIWithDeadConsonantAsWordBeginningRules,
        

        beginningSingleVowelAsWordBeginningRules,

        singleVowelSyllableAsWordEndingRules,
        doubleVowelSyllableRules,
        
        firstSyllableWithSoundA,
        
        singleVowelSyllableRules,

        singleVowelRules,
        deadConsonantRules,
        marbutahRules,
        sukunRules,
        pepetRules,
        punctuationRules,
        numbers))

export const transliterateLatinToPegon = (latinString: string): string =>
    countSyllable(latinString) > 2 ? 
        transliterate(latinString, latinToPegonSchemeForMoreThanTwoSyllables): 
        transliterate(latinString, latinToPegonScheme)

export const transliterateLatinToPegonStemResult = (stemResult: StemResult, lang: string): string => {
    if (stemResult.affixSequence.length == 0) {
        return transliterateLatinToPegon(stemResult.baseWord);
    }

    // TO-DO: insert transliterate rules for different language
    if (lang === "Jawa") {
        // transliterateStemResultJawa
        let base = transliterateLatinToPegon(stemResult.baseWord)
        let [prefix, suffix] = transliterateJawaAffixes(stemResult.affixSequence, stemResult.baseWord)
        return prefix + base + suffix;
    } else if (lang === "Sunda") {
        // transliterateStemResultSunda
        return transliterateLatinToPegon(stemResult.baseWord);
    } else if (lang === "Madura") {
        // transliterateStemResultMadura
        return transliterateLatinToPegon(stemResult.baseWord);
    } else {
        // transliterateStemResultIndonesia
        let base = transliterateLatinToPegon(stemResult.baseWord)
        let [prefix, suffix] = transliterateIndonesianAffixes(stemResult.affixSequence, stemResult.baseWord)
        return prefix + base + suffix;
    }
}

const inverseSpecialPrepositionAsSingleWordsRules: RegexRule[] =
    asSingleWord(asInverse(specialPrepositionRules))

const inversePrefixWithSpaceRules: PlainRule[] =
    asInverse(prefixWithSpaceRules)

const inversePrefixWithSpaceAsWordBeginningRules: RegexRule[] =
    asWordBeginning(inversePrefixWithSpaceRules)

const inverseDeadDigraphConsonantRules: PlainRule[] =
    asInverse(deadDigraphConsonantRules)

const inverseDeadMonographConsonantRules: PlainRule[] =
    asInverse(deadMonographConsonantRules)

const inverseDeadConsonantRules: PlainRule[] =
    asInverse(deadConsonantRules)

const inverseDigraphVowelRules: PlainRule[] =
    asInverse(digraphVowelRules)

const inverseMonographVowelRules: PlainRule[] =
    asInverse(monographVowelRules)

const inverseSingleVowelRules: PlainRule[] =
    asInverse(singleVowelRules)

const inverseBeginningSingleVowelRules: PlainRule[] =
    asInverse(beginningSingleVowelRules)

const inverseSingleEndingVowelRules: PlainRule[] =
    asInverse(singleEndingVowelRules)

const inverseSingleEndingVowelAsWordEndingRules: RegexRule[] =
    asWordEnding(inverseSingleEndingVowelRules)

const inverseDoubleEndingVowelRules: PlainRule[] =
    asInverse(chainRule(doubleEndingVowelRules,
                        alternateDoubleEndingVowelRules))

const inverseDoubleEndingVowelAsWordEndingRules: RegexRule[] =
    asWordEnding(inverseDoubleEndingVowelRules)

const inverseEndingVowelAsWordEndingRules: RegexRule[] =
    chainRule(
        inverseDoubleEndingVowelAsWordEndingRules,
        inverseSingleEndingVowelAsWordEndingRules)

const inverseDoubleVowelRules: PlainRule[] =
    asInverse(chainRule(doubleVowelRules,
                        alternateDoubleMonographVowelRules))

const inverseBeginningDigraphVowelRules: PlainRule[] =
    asInverse(beginningDigraphVowelRules)

const inverseBeginningMonographVowelRules: PlainRule[] =
    asInverse(beginningMonographVowelRules)

const inverseBeginningVowelAsWordBeginningRules: RegexRule[] =
    asWordBeginning(chainRule(inverseBeginningDigraphVowelRules,
                              inverseBeginningMonographVowelRules))

const inverseBeginningIForOpenConsonantRules: PlainRule[] =
    asInverse(beginningIForOpenConsonantRules)

const inverseBeginningIForDeadConsonantRules: PlainRule[] =
    asInverse(beginningIForDeadConsonantRules)

const inversePrefixWithBeginningVowelsRules: PlainRule[] =
    chainRule(
        ruleProduct(inversePrefixWithSpaceRules,
                    inverseBeginningDigraphVowelRules),
        ruleProduct(inversePrefixWithSpaceRules,
                    inverseBeginningMonographVowelRules),
        ruleProduct(inversePrefixWithSpaceRules,
                    inverseBeginningIForDeadConsonantRules))

const inversePrefixWithBeginningVowelsAsWordBeginningRules: RegexRule[] =
    asWordBeginning(inversePrefixWithBeginningVowelsRules)

const inverseMarbutahRules: PlainRule[] =
    asInverse(marbutahRules)

const inverseOpenConsonantRules: PlainRule[] =
    asInverse(consonantRules)

const inverseSpecialRaWithMaddaAboveRules: PlainRule[] =
    asInverse(specialRaWithMaddaAboveRules)

const inverseConsonantRules: PlainRule[] =
    chainRule(
        inverseMarbutahRules,
        inverseDeadDigraphConsonantRules,
        inverseDeadMonographConsonantRules,
        inverseOpenConsonantRules)

const inverseVowelRules: Rule[] =
    chainRule<Rule>(
        inverseBeginningSingleVowelRules,
        inverseBeginningVowelAsWordBeginningRules,
        inverseEndingVowelAsWordEndingRules,
        inverseDoubleVowelRules,
        inverseSingleVowelRules,
        inverseBeginningIForDeadConsonantRules)

const inverseLongEndingWawYaMaksuraRules: PlainRule[] =
    asInverse(longEndingWawYaMaksuraRules)

const inverseDoubleConsonantRules: PlainRule[] =
    asInverse(doubleMonographConsonantRules)

const inversePunctuationRules: PlainRule[] =
    asInverse(punctuationRules)

const inverseSingleVowelSyllableRules: Rule[] =
    chainRule<Rule>(
        asWordEnding(ruleProduct(inverseOpenConsonantRules,
                                 inverseSingleEndingVowelRules)),
        ruleProduct(inverseOpenConsonantRules, inverseDigraphVowelRules),
        ruleProduct(inverseOpenConsonantRules, inverseMonographVowelRules))

const inverseDoubleVowelSyllableRules: Rule[] =
    chainRule<Rule>(
        asWordEnding(ruleProduct(inverseOpenConsonantRules,
                                 inverseDoubleEndingVowelRules)),
        ruleProduct(inverseOpenConsonantRules,
                    inverseDoubleVowelRules))

const inverseSyllableRules: Rule[] =
    chainRule(
        inverseDoubleVowelSyllableRules,
        inverseSingleVowelSyllableRules)

const inverseDoubleMonographVowelAsBeginningSyllableRules: RegexRule[] =
    asWordBeginning(chainRule(
        asInverse(doubleMonographVowelBeginningSyllableRules),
        asInverse(alternateDoubleMonographVowelBeginningSyllableRules)
    ))

const inverseAWithFatha: PlainRule[] = 
    asInverse(aWithFatha)

const inverseSukun: PlainRule[] =
    asInverse(sukunRules)

const inversePepet: PlainRule[] =
    asInverse(pepetRules)

const inverseIndonesianSuffixesWithAn: PlainRule[] =
    asInverse(indonesianSuffixesWithAn)

const inverseVowelStartedWithIRules: PlainRule[] =
    asInverse(vowelStartedWithIRules)

const initiatePegonToLatinScheme = (): Rule[] => {
    return prepareRules(chainRule<Rule>(
        inverseVowelStartedWithIRules,
        inverseIndonesianSuffixesWithAn,
        inverseDoubleEndingVowelAsWordEndingRules,
        inverseLongEndingWawYaMaksuraRules,
        inverseSpecialPrepositionAsSingleWordsRules,
        inverseSpecialRaWithMaddaAboveRules,
        inversePrefixWithBeginningVowelsAsWordBeginningRules,
        inversePrefixWithSpaceAsWordBeginningRules,
        inverseDoubleMonographVowelAsBeginningSyllableRules,
        inverseSyllableRules,
        inverseVowelRules,
        inverseDoubleConsonantRules,
        inverseConsonantRules,
        inversePunctuationRules,
        inverseAWithFatha,
        inverseSukun,
        inversePepet,
        asInverse(numbers),
        asInverse(tatwilRules)
        )
    )
}

export const transliteratePegonToLatin = (pegonString: string, lang: string = "Indonesia"): string => {
    initiateDoubleMonographVowelRules(lang);
    const pegonToLatinScheme: Rule[] = initiatePegonToLatinScheme();
    return transliterate(pegonString, pegonToLatinScheme)
}
                            
const standardLatinRules: PlainRule[] = [
    ["t_h", "th"],
    ["T_h", "th"],
    ["t_s", "ṡ"],
    ["h_h", "ḥ"],
    ["k_h", "kh"],
    ["d_h", "dh"],
    ["d_H", "dh"],
    ["d_l", "ḍ"],
    ["d_z", "ẑ"],
    ["s_y", "sy"],
    ["s_h", "ṣ"],
    ["t_t", "ṭ"],
    ["z_h", "ẓ"],
    ["g_h", "g"],
    ["n_g", "ng"],
    ["n_y", "ny"],
    ["e_u", "eu"],
    ["a_i", "ai"],
    ["a_u", "au"],
    ["^e", "ê"],
    ["`a", "a"],
    ["`i", "i"],
    ["`u", "u"],
    ["`e", "e"],
    ["`o", "o"],
    ["Y", "i"],
    ["O", "o"],
    ["A", "a"],
    ["U", "u"],
    ["G", "g"],
    [".", ""],
    ["^.", ""]
];


export const transliterateReversibleLatinToStandardLatin =
    (reversibleString: string): string =>
    transliterate(reversibleString, prepareRules(standardLatinRules));

/*
  Transitive rules necessities:
  monograph vowels -> digraph vowels
  dead consonants -> open consonants + vowels
  i with dead consonants -> i with open consonants
  di/dak -> vowels/consonants
  product(i for dead consonants, transitive syllables)
  -> product(i for open consonants, transitive syllables)
*/

const IMEPrefixRules: Rule[] =
    asWordBeginning(
        makeTransitive(
            prefixRules.map(([key, val]) =>
                [key, val.replace(Pegon.Ya, Pegon.Maksura)]),
            prefixWithBeginningVowelRules
    ))

const IMESyllableRules: Rule[] =
    chainRule<Rule>(
        asWordEnding(makeTransitive(
            deadMonographConsonantRules,
            marbutahRules,
            deadDigraphConsonantRules,
            ruleProduct(consonantRules,
                        chainRule(singleEndingVowelRules,
                                  monographVowelRules
                                      .filter(([key, val]) => key != "i"))),
            ruleProduct(consonantRules,
                        doubleEndingVowelRules))
            .filter(([key, val]) =>
                !(new RegExp(`^(${pegonConsonants.join("|")})${Pegon.Sukun}(${latinVowels.filter(([key, val]) => key != "i").join("|")})$`)
                    .test(key)))),
        asWordBeginning(makeTransitive(
            deadMonographConsonantRules,
            marbutahRules,
            deadDigraphConsonantRules,
            ruleProduct(consonantRules,
                        chainRule(singleEndingVowelRules,
                                  monographVowelRules
                                      .filter(([key, val]) => key != "i"))),
            doubleMonographVowelBeginningSyllableRules)),
        makeTransitive(
            deadMonographConsonantRules,
            marbutahRules,
            deadDigraphConsonantRules,
            chainRule(
                ruleProduct(consonantRules, digraphVowelRules),
                ruleProduct(consonantRules, monographVowelRules)),
            chainRule(
                ruleProduct(consonantRules, doubleDigraphVowelRules),
                ruleProduct(consonantRules, doubleMonographVowelRules)
            )))

const IMEBeginningIRules: Rule[] =
    chainRule(
        asSingleWord(makeTransitive(
            beginningIForDeadConsonantRules,
            ruleProduct(beginningIForDeadConsonantRules,
                        deadMonographConsonantRules),
            ruleProduct(beginningIForDeadConsonantRules,
                        marbutahRules),
            ruleProduct(beginningIForDeadConsonantRules,
                        deadDigraphConsonantRules),
            ruleProduct(beginningIForOpenConsonantRules,
                        ruleProduct(consonantRules, singleEndingVowelRules)),
        )),
        asWordBeginning(makeTransitive(
            beginningIForDeadConsonantRules,
            ruleProduct(beginningIForDeadConsonantRules,
                        deadMonographConsonantRules),
            ruleProduct(beginningIForDeadConsonantRules,
                        marbutahRules),
            ruleProduct(beginningIForDeadConsonantRules,
                        deadDigraphConsonantRules),
            ruleProduct(beginningIForOpenConsonantRules,
                        ruleProduct(consonantRules, monographVowelRules)))))

const IMEVowelRules: Rule[] =
    chainRule<Rule>(
        asWordEnding(makeTransitive(
            chainRule(
                // the only single ending vowel is "i"
                monographVowelRules
                    .filter(([key, val]) => key != "i"),
                singleEndingVowelRules),
            doubleEndingVowelRules)
            .filter(([key, val]) => key.length > 1)),
        asWordBeginning(makeTransitive(
            beginningMonographVowelRules,
            beginningDigraphVowelRules)),
        makeTransitive(
            chainRule(
                monographVowelRules,
                singleEndingVowelRules),
            doubleMonographVowelRules,
            doubleDigraphVowelRules)
            .filter(([key, val]) => key.length > 1),
        digraphVowelRules,
        monographVowelRules)

const IMESpecialAsNotWordEndingRules: RegexRule[] =
    asNotWordEnding([
        // "i"
        [Pegon.Maksura + Pegon.Sukun, Pegon.Ya + Pegon.Sukun],
        // "ae"
        [Pegon.Fatha + Pegon.Alif +
            Pegon.Ha +
            Pegon.Fatha + Pegon.Maksura + Pegon.Sukun,
         Pegon.Fatha + Pegon.Alif +
            Pegon.Ha +
            Pegon.Fatha + Pegon.Ya + Pegon.Sukun],
        // "ai"
        [Pegon.Fatha + Pegon.Alif +
            Pegon.Ha +
            Pegon.Kasra + Pegon.Maksura + Pegon.Sukun,
         Pegon.Fatha + Pegon.Alif +
            Pegon.Ha +
            Pegon.Kasra + Pegon.Ya + Pegon.Sukun],
        // "ea"
        [Pegon.Fatha + Pegon.Ya + Pegon.Sukun +
            Pegon.Ya +
            Pegon.Fatha + Pegon.Alif,
         Pegon.Fatha + Pegon.Ya + Pegon.Sukun +
             Pegon.Alif + Pegon.Fatha],
        // "ia"
        [Pegon.Kasra + Pegon.Ya + Pegon.Sukun + 
            Pegon.Ya +
            Pegon.Fatha + Pegon.Alif,
         Pegon.Kasra +
            Pegon.Ya +
            Pegon.Fatha + Pegon.Alif],
        // "aa"
        [Pegon.Fatha + Pegon.Alif +
            Pegon.Ha +
            Pegon.Fatha + Pegon.Alif,
         Pegon.Fatha + Pegon.Alif + Pegon.AlifWithHamzaAbove],
        // "oa"
        [Pegon.Fatha + Pegon.Waw + Pegon.Sukun +
            Pegon.Ha +
            Pegon.Fatha + Pegon.Alif,
        Pegon.Fatha + Pegon.Waw + Pegon.Sukun +
             Pegon.Alif + Pegon.Fatha,],
        // "ua"
        [Pegon.Damma + Pegon.Waw + Pegon.Sukun +
            Pegon.Waw +
            Pegon.Fatha + Pegon.Alif,
        Pegon.Damma + Pegon.Waw + Pegon.Sukun +
            Pegon.Alif + Pegon.Fatha],
    ])


// TODO: make this pass for the ime tests
// Alternatively, just go ahead and make it all contextual
const IMERules: Rule[] = prepareRules(chainRule<Rule>(
    IMEPrefixRules,
    IMEBeginningIRules,
    beginningSingleVowelAsWordBeginningRules,
    IMESyllableRules,
    IMEVowelRules,
    IMESpecialAsNotWordEndingRules,
    punctuationRules,
))

export function initIME(): InputMethodEditor {
    return {
        "rules": IMERules,
        "inputEdit": (inputString: string): string => 
            transliterate(inputString, IMERules)
    }
}
