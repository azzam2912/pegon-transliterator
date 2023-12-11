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
    AlefWasla = "\u0671",
    WawHamzaAbove= "\u0624",
    AlefMaksura = "\u0649",

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
    SubAlef = "\u0656",
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
    DhaWithOneDotBelow = "\u068A",
    DhaWithThreeDotsABove = "\u068E",
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
    Hamza = "\u0621"
}

const punctuationRules: PlainRule[] = [
    ["\n1,", Pegon.Comma]
]
const marbutahRules: PlainRule[] = [
    ["\n1t_", Pegon.TaMarbuta]
]

const sukunRules: PlainRule[] = [
    ["\n1.", Pegon.Sukun],
    ["\n1^.", Pegon.Sukun2]
]

const monographVowelRules: PlainRule[] = [
    ["\n1a", Pegon.Alif],
    // asumsi semua e tanpa diakritik taling
	["\n1e", Pegon.Fatha + Pegon.Ya],
	["\n1o", Pegon.Fatha + Pegon.Waw],
	["\n1i", Pegon.Ya],
	["\n1u", Pegon.Waw],
    //second options of rules 4, 5, 6
    ['\n1W', Pegon.Waw],
    ['\n1A', Pegon.Alif],
    ['\n1Y', Pegon.Ya]
]

const digraphVowelRules: PlainRule[] = [
    ["\n2^e", Pegon.MaddaAbove],
    ["\n2`a", Pegon.YaWithHamzaAbove + Pegon.Alif]
]

const monographVowelHarakatAtFirstAbjadRules: PlainRule[] = [
    ["\n3a", Pegon.Alif],
    ["\n3e", Pegon.Ya + Pegon.Fatha + Pegon.Sukun],
    ["\n3o", Pegon.Waw + Pegon.Fatha + Pegon.Sukun],
    ["\n3i", Pegon.Ya + Pegon.Kasra + Pegon.Sukun],
    ["\n3u", Pegon.Waw + Pegon.Damma + Pegon.Sukun],    
]
    
const singleVowelRules: PlainRule[] =
    chainRule(
        digraphVowelRules,
        monographVowelHarakatAtFirstAbjadRules)

const singleEndingVowelRules: PlainRule[] = [
    ["\n4i", Pegon.Ya]
]

const singleVowelAsWordEndingRules: RegexRule[] =
    asWordEnding(singleEndingVowelRules);

const beginningDigraphVowelRules: PlainRule[] = [
    ["\n5^e", Pegon.Alif + Pegon.MaddaAbove],
]

const beginningMonographVowelRules: PlainRule[] = [
    ["\n5a", Pegon.AlifWithHamzaAbove],
    ["\n5e", Pegon.Alif + Pegon.Fatha + Pegon.Ya],
    ["\n5i", Pegon.Alif + Pegon.Ya ],
    ["\n5o", Pegon.Alif + Pegon.Fatha + Pegon.Waw],
    ["\n5u", Pegon.Alif + Pegon.Waw],
]

const beginningSingleVowelRules: PlainRule[] =
    chainRule(
        beginningDigraphVowelRules,
        beginningMonographVowelRules)

const beginningIForDeadConsonantRules: PlainRule[] = [
    ["\n0i", Pegon.AlifWithHamzaBelow]
]

const beginningIForOpenConsonantRules: PlainRule[] = [
    ["\n6i", Pegon.Alif + Pegon.Ya]
]

const doubleDigraphVowelRules: PlainRule[] = [
    ["\n7a^e", Pegon.Alif +
        Pegon.YaWithHamzaAbove + Pegon.MaddaAbove],
    ["\n7i^e", Pegon.Ya + 
        Pegon.YaWithHamzaAbove + Pegon.MaddaAbove],
    ["\n7u^e", Pegon.Waw +
        Pegon.YaWithHamzaAbove + Pegon.MaddaAbove],
    ["\n7e^e", Pegon.Fatha + Pegon.Ya +
        Pegon.YaWithHamzaAbove + Pegon.MaddaAbove],
    ["\n7o^e", Pegon.Fatha + Pegon.Waw +
        Pegon.YaWithHamzaAbove + Pegon.MaddaAbove],

]

const doubleMonographVowelRulesStandard: PlainRule[] = [
    ["\n8ae", Pegon.Alif +
        Pegon.Ha +
        Pegon.Fatha + Pegon.Ya],
    ["\n8a`e", Pegon.Alif +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Ya],
    ["\n8ai", Pegon.Alif +
        Pegon.Ha +
        Pegon.Ya],
    ["\n8a`i", Pegon.Alif +
        Pegon.YaWithHamzaAbove +
        Pegon.Ya],
    ["\n8au", Pegon.Alif +
        Pegon.Ha +
        Pegon.Waw],
    ["\n8aU", Pegon.Alif +
        Pegon.Alif +
        Pegon.Waw],
    ["\n8iu", Pegon.Ya +
        Pegon.Ya +
        Pegon.Waw],
    ["\n8i`u", Pegon.Ya +
        Pegon.YaWithHamzaAbove +
        Pegon.Waw],
    ["\n8Ya", Pegon.Ya +
        Pegon.Ya + Pegon.Alif],
    ["\n8Y`a", Pegon.Ya +
        Pegon.YaWithHamzaAbove + Pegon.Alif],
    ["\n8aa", 
        Pegon.Alif + 
        Pegon.AlifWithHamzaAbove + Pegon.Fatha],
    ["\n8aa", 
        Pegon.Alif + 
        Pegon.AlifWithHamzaAbove], 
    ["\n8aa", 
        Pegon.Alif + 
        Pegon.AlifWithHamzaAbove + Pegon.Fatha],
    ["\n8aa", 
        Pegon.Alif + 
        Pegon.AlifWithHamzaAbove],
    ["\n8ao", Pegon.Alif +
        Pegon.Ha +
        Pegon.Fatha + Pegon.Waw],
    ["\n8aO", Pegon.Alif +
        Pegon.Alif +
        Pegon.Fatha + Pegon.Waw],
    ["\n8eo", Pegon.Fatha + Pegon.Ya +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Waw],
    ["\n8io", Pegon.Ya +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Waw],
]

const doubleMonographVowelRulesSunda: PlainRule[] = [
    ...doubleMonographVowelRulesStandard,
    // Pegon Sunda
    ["\n8e_u", Pegon.MaddaAbove +
        Pegon.Waw],
    ["\n8a_i", Pegon.Fatha +
        Pegon.Ya +
        Pegon.Sukun],
    ["\n8a_u", Pegon.Fatha +
        Pegon.Waw +
        Pegon.Sukun],
]

var doubleMonographVowelRules: PlainRule[] = doubleMonographVowelRulesSunda;

const initiateDoubleMonographVowelRules = (lang: string) => {
    if(lang === "Sunda"){
        doubleMonographVowelRules = doubleMonographVowelRulesSunda;
    } else {
        doubleMonographVowelRules = doubleMonographVowelRulesStandard;
    }
}

const doubleMonographBeginningSyllableVowelRules: PlainRule[] = [
    ["\n9iu",Pegon.Ya +
        Pegon.Ya +
        Pegon.Waw],
    ["\n9ia", Pegon.Ya +
        Pegon.Alif],
    // ["eo", Pegon.Fatha +
    //     Pegon.Damma + Pegon.Waw + Pegon.Sukun],
    ["\n9ia", Pegon.Kasra +
        Pegon.Ya +
        Pegon.Fatha + Pegon.Alif],
    ["\n9eo", Pegon.Fatha + Pegon.Ya +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Waw],
    ["\n9io", Pegon.Ya +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Waw],    
]

const alternateDoubleMonographVowelRules: PlainRule[] = [
    ["\n10ae", Pegon.Fatha + Pegon.Alif +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Ya + Pegon.Sukun],
    ["\n10ai", Pegon.Alif +
        Pegon.YaWithHamzaAbove +
        Pegon.Ya],
    ["\n10au", Pegon.Alif +
        Pegon.Alif +
        Pegon.Waw],
    ["\n10iu", Pegon.Ya +
        Pegon.YaWithHamzaAbove +
        Pegon.Waw],
    ["\n10ia", Pegon.Kasra + Pegon.Ya + Pegon.Sukun + Pegon.Sukun +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Alif],
    ["\n10ao", Pegon.Alif +
        Pegon.Ha +
        Pegon.Fatha + Pegon.Waw],
    ["\n10aO", Pegon.Alif +
        Pegon.Alif +
        Pegon.Fatha + Pegon.Waw],
]

const alternateDoubleMonographBeginningSyllableVowelRules: PlainRule[] = [
    ["\n11iu", Pegon.Kasra +
        Pegon.YaWithHamzaAbove +
        Pegon.Damma + Pegon.Waw + Pegon.Sukun],
    ["\n11ia", Pegon.Kasra +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Alif],
]

const doubleVowelRules: PlainRule[] =
    chainRule(
        doubleDigraphVowelRules,
        doubleMonographVowelRules)

const doubleEndingVowelRules: PlainRule[] = [
    ["\n12ae", Pegon.Alif +
        Pegon.Ha +
        Pegon.Fatha + Pegon.Ya],
    ["\n12ai", Pegon.Alif +
        Pegon.Ha +
        Pegon.Ya],
    ["\n12ea", Pegon.Fatha + Pegon.Ya + Pegon.Sukun +
        Pegon.Ya +
        Pegon.Fatha + Pegon.Alif],
    ["\n12^ea", Pegon.Fatha + Pegon.Ya +
        Pegon.Ya +
        Pegon.Alif],
    ["\n12aa", Pegon.Alif +
        Pegon.Ha +
        Pegon.Alif],
    ["\n12oa", Pegon.Fatha + Pegon.Waw +
        Pegon.Ha +
        Pegon.Alif],
    ["\n12ua", Pegon.Waw +
        Pegon.Waw +
        Pegon.Alif],
    ["\n12ia", Pegon.Ya + 
        Pegon.Ya +
        Pegon.Alif],
]

const alternateDoubleEndingVowelRules: PlainRule[] = [
    ["\n13ae", Pegon.Fatha + Pegon.Alif +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Maksura + Pegon.Sukun],
    ["\n13ai", Pegon.Fatha + Pegon.Alif +
        Pegon.YaWithHamzaAbove +
        Pegon.Kasra + Pegon.Maksura + Pegon.Sukun],
]

const doubleVowelAsWordEndingRules: RegexRule [] =
    asWordEnding(doubleEndingVowelRules);

const beginningSingleVowelAsWordBeginningRules: RegexRule[] =
    asWordBeginning(beginningSingleVowelRules);

const monographConsonantRules: PlainRule[] = [
    ["\n14b", Pegon.Ba],
    ["\n14t", Pegon.Ta],
    ["\n14c", Pegon.Ca],
    ["\n14d", Pegon.Dal],
    ["\n14r", Pegon.Ra],
    ["\n14z", Pegon.Zain],
    ["\n14s", Pegon.Sin],
    ["\n14'", Pegon.Ain],
    ["\n14j", Pegon.Jim],
    ["\n14f", Pegon.Fa],
    ["\n14q", Pegon.Qaf],
    ["\n14p", Pegon.Peh],
    ["\n14v", Pegon.Peh],
    ["\n14k", Pegon.Kaf],
    ["\n14G", Pegon.KafWithOneDotBelow],
    ["\n14g", Pegon.KafWithThreeDotsBelow],
    ["\n14l", Pegon.Lam],
    ["\n14m", Pegon.Mim],
    ["\n14n", Pegon.Nun],
    ["\n14h", Pegon.Ha],
    ["\n14w", Pegon.Waw],
    ["\n14y", Pegon.Ya],
    // Tambahan konsonan Arab
    ["\n14'`", Pegon.Hamza]
]

const digraphConsonantRules: PlainRule[] = [
    // special combination using diacritics, may drop
    // ["t_h", Pegon.ThaWithOneDotBelow],
    // the one in id.wikipedia/wiki/Abjad_Pegon
    ["\n15t_h", Pegon.ThaWithThreeDotsAbove],
    ["\n15t_s", Pegon.Tsa],
    ["\n15h_h", Pegon.Ho],
    ["\n15k_h", Pegon.Kho],
    ["\n15d_h", Pegon.DhaWithOneDotBelow],
    ["\n15d_z", Pegon.Dzal],
    ["\n15s_y", Pegon.Syin],
    ["\n15s_h", Pegon.Shod],
    ["\n15d_H", Pegon.Dho],
    ["\n15t_t", Pegon.Tha],
    ["\n15z_h", Pegon.Zha],
    ["\n15g_h", Pegon.Ghain],
    ["\n15n_g", Pegon.Nga],
    ["\n15n_y", Pegon.Nya],
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
    ["\n16dak", Pegon.Dal + Pegon.Fatha + Pegon.Alif + Pegon.Kaf + Pegon.Sukun],
    ["\n16di", Pegon.Dal + Pegon.Kasra + Pegon.Ya + Pegon.Sukun]
]

const specialPrepositionRules: PlainRule[] = [
    ["\n16di", Pegon.Dal + Pegon.Kasra + Pegon.Maksura + Pegon.Sukun]
]

const prefixWithSpaceRules: PlainRule[] =
    prefixRules.map(([key, val]) => [key, val.concat("\n")])

const specialRaWithPepetRules: PlainRule[] = [
    ["\n16r^e", Pegon.Ra + Pegon.Fatha + Pegon.Ya]
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
    ["\n17a", Pegon.Fatha],
]   

const closedSyllable = (rules: PlainRule[]): RegexRule[] =>
    prepareRules(rules).map<RegexRule>(([key, val]) =>
        [new RegExp(`(${key})(?![_aiueo^\`WAIUEOY])`), `${val}`])

const closedSyllableWithSoundARules: RegexRule[] =
    closedSyllable(ruleProduct(ruleProduct(consonantRules,aWithFatha), consonantRules))


const indonesianPrefixesRules: PlainRule[] = [
    ["\n18di", Pegon.Dal + Pegon.Ya],
    ["\n18k^e", Pegon.Kaf + Pegon.MaddaAbove],
    ["\n18s^e", Pegon.Sin + Pegon.MaddaAbove],
    ["\n18b^er", Pegon.Ba + Pegon.MaddaAbove + Pegon.Ra],
    ["\n18b^e", Pegon.Ba + Pegon.MaddaAbove],
    ["\n18t^er", Pegon.Ta + Pegon.MaddaAbove + Pegon.Ra],
    ["\n18t^e", Pegon.Ta + Pegon.MaddaAbove],
    ["\n18m^em", Pegon.Mim + Pegon.MaddaAbove + Pegon.Mim],
    ["\n18m^en_g", Pegon.Mim + Pegon.MaddaAbove + Pegon.Nga],
    ["\n18m^en", Pegon.Mim + Pegon.MaddaAbove + Pegon.Nun],
    ["\n18m^e", Pegon.Mim + Pegon.MaddaAbove],
    ["\n18p^er", Pegon.Peh + Pegon.MaddaAbove + Pegon.Ra],
    ["\n18p^em", Pegon.Peh + Pegon.MaddaAbove + Pegon.Mim],
    ["\n18p^en_g", Pegon.Peh + Pegon.MaddaAbove + Pegon.Nga],
    ["\n18p^en", Pegon.Peh + Pegon.MaddaAbove + Pegon.Nun],
    ["\n18p^e", Pegon.Peh + Pegon.MaddaAbove],
]

const transliterateIndonesianPrefixes =
    (prefix: string): string =>
        transliterate(prefix, prepareRules(indonesianPrefixesRules));

const indonesianSuffixes: PlainRule[] = [
    ["\n19ku", Pegon.Kaf + Pegon.Waw],
    ["\n19mu", Pegon.Mim + Pegon.Waw],
    ["\n19n_ya", Pegon.Nya + Pegon.Alif],
    ["\n19lah", Pegon.Lam + Pegon.Fatha + Pegon.Ha],
    ["\n19kah", Pegon.Kaf + Pegon.Fatha + Pegon.Ha],
    ["\n19tah", Pegon.Ta + Pegon.Fatha + Pegon.Ha],
    ["\n19pun", Pegon.Peh + Pegon.Waw + Pegon.Nun],
    ["\n19kan", Pegon.Kaf + Pegon.Fatha + Pegon.Nun],
]
const suffixAnForBaseWordWithEndingA: PlainRule[] = [
    
    ["\n19an", Pegon.AlifWithHamzaAbove + Pegon.Nun],
]

const suffixAn: PlainRule[] = [
    ["\n20an", Pegon.Alif + Pegon.Nun],
]

const indonesianSuffixesForBaseWordWithEndingA: PlainRule[] =
    chainRule(indonesianSuffixes, 
        suffixAnForBaseWordWithEndingA)

const indonesianSuffixesForRegularBaseWord: PlainRule[] =
    chainRule(indonesianSuffixes, 
        suffixAn)

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
    ["\n21a", ""],
    ["\n21i", ""],
    ["\n21u", ""],
    ["\n21e", ""],
    ["\n21o", ""],
    ["\n21W", ""],
    ["\n21A", ""],
    ["\n21Y", ""],
]

const suffixFirstLetterVowel: PlainRule[] = [
    ["\n22a", Pegon.Alif],
    ["\n22i", Pegon.Ya],
    ["\n22e", Pegon.Alif + Pegon.Fatha + Pegon.Ya],
]

const doubleVowelForSuffixRules: PlainRule [] = [
    ["\n23ae", Pegon.Ha + Pegon.Fatha + Pegon.Ya],
    ["\n23ai", Pegon.Ha + Pegon.Ya],
    ["\n23Ya", Pegon.Ya + Pegon.Alif],
    ["\n23aa", Pegon.AlifWithHamzaAbove],
]

const baseWordLastLetterVowelSuffixFirstLetterVowel: PlainRule[] = 
    chainRule(doubleVowelForSuffixRules,
        ruleProduct(baseWordLastLetterVowel, suffixFirstLetterVowel))

const doubleEndingVowelForSuffixRules: PlainRule[] = [
    ["\n24ae", Pegon.Ha + Pegon.Fatha + Pegon.Ya],
    ["\n24ai", Pegon.Ha + Pegon.Ya],
    ["\n24ea", Pegon.Ya + Pegon.Fatha + Pegon.Alif],
    ["\n24^ea", Pegon.Ya + Pegon.Ya + Pegon.Alif],
    ["\n24aa", Pegon.Ha + Pegon.Alif],
    ["\n24oa", Pegon.Ha + Pegon.Alif],
    ["\n24ua", Pegon.Waw + Pegon.Alif],
    ["\n24ia", Pegon.Ya + Pegon.Alif],
]

const jawaPrefixesRules: PlainRule[] = [
    ["\n25di", Pegon.Dal + Pegon.Ya],
    ["\n25su", Pegon.Sin + Pegon.Waw],
    ["\n25pri", Pegon.Peh + Pegon.Ra + Pegon.Ya],
    ["\n25wi", Pegon.Waw + Pegon.Ya],
    ["\n25k^e", Pegon.Kaf + Pegon.MaddaAbove],
    ["\n25sa", Pegon.Sin + Pegon.Fatha],
    ["\n25dak", Pegon.Dal + Pegon.Fatha + Pegon.Kaf],
    ["\n25da", Pegon.Dal + Pegon.Fatha],
    ["\n25tar", Pegon.Ta + Pegon.Fatha + Pegon.Ra],
    ["\n25tak", Pegon.Ta + Pegon.Fatha + Pegon.Kaf],
    ["\n25ta", Pegon.Ta + Pegon.Fatha],
    ["\n25kok", Pegon.Kaf + Pegon.Fatha + Pegon.Waw + Pegon.Kaf],
    ["\n25ko", Pegon.Kaf + Pegon.Fatha + Pegon.Waw],
    ["\n25tok", Pegon.Ta + Pegon.Fatha + Pegon.Waw + Pegon.Kaf],
    ["\n25to", Pegon.Ta + Pegon.Fatha + Pegon.Waw],
    ["\n25pi", Pegon.Peh + Pegon.Ya],
    ["\n25kami", Pegon.Kaf + Pegon.Fatha + Pegon.Mim + Pegon.Ya],
    ["\n25kapi", Pegon.Kaf + Pegon.Fatha + Pegon.Peh + Pegon.Ya],
    ["\n25kuma", Pegon.Kaf + Pegon.Waw + Pegon.Mim + Pegon.Fatha],
    ["\n25ka", Pegon.Kaf + Pegon.Fatha],
    ["\n25pra", Pegon.Peh + Pegon.Ra + Pegon.Fatha],
    ["\n25pan_g", Pegon.Peh + Pegon.Fatha + Pegon.Nga],
    ["\n25pan", Pegon.Peh + Pegon.Fatha + Pegon.Nun],
    ["\n25pam", Pegon.Peh + Pegon.Fatha + Pegon.Mim],
    ["\n25pa", Pegon.Peh + Pegon.Fatha],
    ["\n25man_g", Pegon.Mim + Pegon.Fatha + Pegon.Nga],
    ["\n25man", Pegon.Mim + Pegon.Fatha + Pegon.Nun],
    ["\n25mam", Pegon.Mim + Pegon.Fatha + Pegon.Mim],
    ["\n25ma", Pegon.Mim + Pegon.Fatha],
    ["\n25m^en_g", Pegon.Mim + Pegon.MaddaAbove + Pegon.Nga],
    ["\n25m^en", Pegon.Mim + Pegon.MaddaAbove + Pegon.Nun],
    ["\n25m^em", Pegon.Mim + Pegon.MaddaAbove + Pegon.Mim],
    ["\n25m^e", Pegon.Mim + Pegon.MaddaAbove],
    ["\n25an_g", Pegon.Ha + Pegon.Fatha + Pegon.Nga],
    ["\n25am", Pegon.Ha + Pegon.Fatha + Pegon.Mim],
    ["\n25an", Pegon.Ha + Pegon.Fatha + Pegon.Nun],
    ["\n25a", Pegon.Ha + Pegon.Fatha],
]

const jawaSuffixesRules: PlainRule[] = [
    ["\n26i", Pegon.Ya],
    ["\n26ake", Pegon.Alif + Pegon.Kaf + Pegon.Fatha + Pegon.Ya],
    ["\n26en", Pegon.Fatha + Pegon.Ya + Pegon.Nun],
    ["\n26na", Pegon.Nun + Pegon.Alif],
    ["\n26ana", Pegon.Alif + Pegon.Nun + Pegon.Alif],
    ["\n26an", Pegon.Alif + Pegon.Nun],
    ["\n26e", Pegon.Fatha + Pegon.Ya],
    ["\n26a", Pegon.Alif],
]

const transliterateJawaPrefixes =
    (prefix: string): string =>
        transliterate(prefix, prepareRules(jawaPrefixesRules));

const transliterateJawaSuffixesVowel = (suffix: string, baseWord: string): string => {
    const jawaSuffixesRulesAlt: PlainRule[] = [
        ["\n27na", Pegon.Nun + Pegon.Alif],
        ["\n27ke", Pegon.Kaf + Pegon.Fatha + Pegon.Ya],
        ["\n27n", Pegon.Nun],
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
    ["\n0", Arab.Shifr],
    ["\n1", Arab.Wahid],
    ["\n2", Arab.Itsnan],
    ["\n3", Arab.Tsalatsah],
    ["\n4", Arab.Arbaah],
    ["\n5", Arab.Khamsah],
    ["\n6", Arab.Sittah],
    ["\n7", Arab.Sabaah],
    ["\n8", Arab.Tsamaniyah],
    ["\n9", Arab.Tisah]
]

const latinToPegonScheme: Rule[] =
    prepareRules(chainRule(
        specialPrepositionAsSingleWordsRule,
        specialRaWithPepetRules,
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
        numbers))

const latinToPegonSchemeForMoreThanTwoSyllables: Rule[] =
    prepareRules(chainRule(
        specialPrepositionAsSingleWordsRule,
        specialRaWithPepetRules,
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

const inverseSpecialRaWithPepetRules: PlainRule[] =
    asInverse(specialRaWithPepetRules)

const inverseConsonantRules: PlainRule[] =
    chainRule(
        inverseMarbutahRules,
        inverseDeadDigraphConsonantRules,
        inverseDeadMonographConsonantRules,
        inverseOpenConsonantRules)

const inverseVowelRules: Rule[] =
    chainRule<Rule>(
        inverseBeginningVowelAsWordBeginningRules,
        inverseEndingVowelAsWordEndingRules,
        inverseDoubleVowelRules,
        inverseSingleVowelRules,
        inverseBeginningIForDeadConsonantRules)

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

const initiatePegonToLatinScheme = (): Rule[] => {
    return prepareRules(chainRule<Rule>(
        inverseSpecialPrepositionAsSingleWordsRules,
        inverseSpecialRaWithPepetRules,
        inversePrefixWithBeginningVowelsAsWordBeginningRules,
        inversePrefixWithSpaceAsWordBeginningRules,
        inverseDoubleMonographVowelAsBeginningSyllableRules,
        inverseDoubleEndingVowelAsWordEndingRules,
        inverseSyllableRules,
        inverseVowelRules,
        inverseConsonantRules,
        inversePunctuationRules,
        inverseAWithFatha,
        inverseSukun,
        asInverse(numbers)))
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
