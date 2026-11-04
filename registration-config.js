/* Shared by the browser and Apps Script. Archive this file when changing the notice version. */
const REGISTRATION_CONFIG = Object.freeze({
  apiVersion: "consent-employment-v1",
  consentVersion: "HAPPY-2026-11-04-v1",
  employmentStatuses: ["Employed", "Self-employed", "Unemployed", "Student", "Other"],
  incomeRanges: ["None", "1-200", "201-500", "501-700", "701-1000", "1001-1200", "1201-1500", "1501-1700", "1701-2000", "Above 2000"],
  sectors: [
    "Agriculture, livestock & fishing", "Agribusiness & food processing",
    "Manufacturing & production", "Fashion, tailoring & textiles",
    "Wholesale, retail & trading", "Hospitality, tourism & food services",
    "Construction & skilled trades", "Transport, delivery & logistics",
    "Information technology & digital services", "Finance, banking & insurance",
    "Education & training", "Healthcare & social care", "Beauty & personal care",
    "Media, arts & entertainment", "Energy, mining & utilities",
    "Government & public services", "NGOs & community organisations",
    "Domestic & household services", "Other"
  ],
  consentSummary: "HAPPY Program collects and uses your information, including employment and income details, for training, placement, reporting, and program improvement. Information may be shared with Jobberman Ghana, Agri-Impact Limited, funding partners, and approved processors for these purposes. You may request access, correction, restriction, or withdrawal of consent where applicable.",
  consentIntroduction: "HAPPY Program collects participant data to support training, placement, reporting, and program improvement. Consent is required before registration.",
  consentSections: [
    ["Purpose", "We collect personal data to analyse program progress, improve services, and monitor the effectiveness of the Harnessing Agricultural Productivity and Prosperity for Youth program."],
    ["Data Collected", "Name, age, gender, contact details, education, location, participation details, CV status, and employability information. Employment status, occupation or business, monthly salary/income range, work sector, and work location. Refugee/displaced status, disability status, training details, and job placement details where applicable. The categories collected depend on the participant's activities. A participant-drawn signature or mark is stored as a record of consent."],
    ["Data Sharing", "Data may be shared with Jobberman Ghana, Agri-Impact Limited, funding partners, and approved data processors for monitoring, evaluation, and program delivery."],
    ["Your Rights", "You may request access, correction, restriction, or withdrawal of consent where applicable."]
  ],
  privacyUrl: "https://mastercardfdn.org/privacy/",
  consentDeclaration: "By signing and submitting, I confirm that the information provided is correct, that I have read or had explained to me the participant consent notice, and that I agree to the collection and use of my data as described."
});
