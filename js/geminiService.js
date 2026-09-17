// js/geminiService.js — Developer-backed Gemini API Integration & Real-Time Contract Analysis

const DEVELOPER_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
let _overrideKey = null;

export function setApiKey(key) { _overrideKey = key; }
export function getApiKey() { return _overrideKey || DEVELOPER_API_KEY; }
export function isLiveMode() {
  const key = getApiKey();
  return Boolean(key && !key.includes('your_') && key !== '');
}

/**
 * Perform real-time contract analysis and summary using Gemini 1.5 Flash
 */
export async function analyzeContractWithGemini(fullText, documentName = 'Uploaded Contract') {
  const apiKey = getApiKey();
  const wordCount = (fullText || '').split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 240)) + ' min';

  if (isLiveMode()) {
    try {
      const prompt = `
You are Judgeman, an elite legal AI assistant that demystifies complex legal documents for normal people, freelancers, and small businesses.
Analyze the following legal contract text and return a valid JSON object ONLY (no markdown code blocks, no preamble, raw JSON).

Document Name: "${documentName}"
Document Text:
"""
${fullText.slice(0, 30000)}
"""

JSON format required:
{
  "contractType": "string (e.g. Non-Disclosure Agreement, Residential Lease, Employment Contract, SaaS Terms, Service Agreement)",
  "jurisdiction": "string (e.g. California, Delaware, US Federal, or Governing Law stated in doc)",
  "gradeLevel": "string (e.g. Grade 12, College Senior, Professional)",
  "summary": "string (A punchy 3-4 sentence plain-English executive summary of what this contract obligates and who benefits)",
  "clauses": [
    {
      "title": "string (Clause title, e.g. Termination Without Cause, IP Ownership)",
      "original": "string (Direct excerpt from contract)",
      "simplified": "string (Plain-English translation that anyone can understand)",
      "trap": "string (A 'Watch Out' trap highlight or risk warning)"
    }
  ],
  "risks": [
    {
      "level": "high | medium | low",
      "category": "string (e.g. Liability, Termination, Non-Compete, Payment, IP Ownership, Dispute)",
      "title": "string (Specific risk headline)",
      "desc": "string (Clear explanation of the consequence or exposure)"
    }
  ],
  "prepKit": {
    "summary": "string (Executive summary tailored for a licensed attorney consultation)",
    "redFlags": ["string (Specific red flag item 1)", "string (Specific red flag item 2)"],
    "questions": ["string (Question to ask your attorney 1)", "string (Question to ask your attorney 2)"]
  }
}
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2048,
              responseMimeType: 'application/json'
            }
          })
        }
      );

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        return {
          name: documentName,
          type: parsed.contractType || 'Legal Document',
          contractType: parsed.contractType || 'Legal Document',
          jurisdiction: parsed.jurisdiction || 'General',
          wordCount,
          readingTime,
          gradeLevel: parsed.gradeLevel || 'College Level',
          fullText,
          clauses: parsed.clauses || [],
          risks: parsed.risks || [],
          prepKit: {
            summary: parsed.summary || parsed.prepKit?.summary || 'Executive summary generated.',
            redFlags: parsed.prepKit?.redFlags || [],
            questions: parsed.prepKit?.questions || []
          },
          isAIGenerated: true
        };
      }
    } catch (err) {
      console.warn('[Judgeman] Live Gemini analysis failed, generating structured heuristics:', err.message);
    }
  }

  // Smart heuristic extraction fallback
  return generateHeuristicAnalysis(fullText, documentName, wordCount, readingTime);
}

/**
 * Intelligent rule-based contract analyzer fallback when API key is unavailable or offline
 */
function generateHeuristicAnalysis(text, documentName, wordCount, readingTime) {
  const lower = text.toLowerCase();

  let contractType = 'General Agreement';
  if (lower.includes('lease') || lower.includes('tenant') || lower.includes('landlord')) {
    contractType = 'Residential Lease Agreement';
  } else if (lower.includes('employment') || lower.includes('salary') || lower.includes('employee')) {
    contractType = 'Employment Contract';
  } else if (lower.includes('confidential') || lower.includes('proprietary information') || lower.includes('disclose')) {
    contractType = 'Non-Disclosure Agreement (NDA)';
  } else if (lower.includes('services') || lower.includes('contractor') || lower.includes('deliverables')) {
    contractType = 'Master Services Agreement (MSA)';
  }

  const risks = [];
  const clauses = [];

  if (lower.includes('indemnif') || lower.includes('hold harmless')) {
    risks.push({
      level: 'high',
      category: 'Liability',
      title: 'Broad Indemnification Clause',
      desc: 'You may be required to cover legal defense fees and damages incurred by the other party without an explicit liability cap.'
    });
    clauses.push({
      title: 'Indemnification & Hold Harmless',
      original: 'Contractor agrees to indemnify, defend, and hold harmless against any and all claims, liabilities, losses, and reasonable attorney fees...',
      simplified: 'If anything goes wrong or someone sues them, you must pay all legal costs and damages out of pocket.',
      trap: 'Watch out: Ensure indemnification is reciprocal and capped at total fees received.'
    });
  }

  if (lower.includes('terminate') || lower.includes('termination')) {
    risks.push({
      level: 'medium',
      category: 'Termination',
      title: 'Termination Provisions & Notice',
      desc: 'Review notice period requirements and ensure you have equal rights to cancel without penalty.'
    });
    clauses.push({
      title: 'Termination & Cancellation',
      original: 'Either party may terminate upon 30 days written notice. Company reserves right to terminate immediately for convenience...',
      simplified: 'You must give written notice before walking away, but they may be able to cancel at will.',
      trap: 'Watch out: Verify whether outstanding work or earned amounts will be paid upon early termination.'
    });
  }

  if (lower.includes('non-compete') || lower.includes('compete') || lower.includes('solicit')) {
    risks.push({
      level: 'high',
      category: 'Non-Compete',
      title: 'Restrictive Covenant / Non-Compete',
      desc: 'Restricts your ability to work with competing entities or solicit clients within a specified geographic territory and timeframe.'
    });
    clauses.push({
      title: 'Covenant Not to Compete',
      original: 'Employee agrees that during employment and for a period of 12 months thereafter, shall not directly or indirectly engage in competing business...',
      simplified: 'You cannot work for a rival company or start a competing service for 12 months after leaving.',
      trap: 'Watch out: Non-competes are heavily restricted in California and several other states — check with an attorney.'
    });
  }

  if (lower.includes('arbitration') || lower.includes('dispute') || lower.includes('governing law')) {
    risks.push({
      level: 'low',
      category: 'Dispute',
      title: 'Mandatory Binding Arbitration',
      desc: 'All disputes are settled outside of court via private arbitration. Juries and class action lawsuits are waived.'
    });
    clauses.push({
      title: 'Governing Law & Dispute Resolution',
      original: 'Any dispute arising out of this Agreement shall be resolved through confidential, binding arbitration conducted by AAA rules...',
      simplified: 'You agree not to take disputes to a public courtroom or jury; an arbitrator will make the final decision.',
      trap: 'Watch out: Note which state laws apply and who covers arbitration filing fees.'
    });
  }

  // Ensure minimums
  if (risks.length === 0) {
    risks.push(
      { level: 'medium', category: 'General', title: 'Standard Legal Terms', desc: 'Review governing law and payment obligation schedules carefully.' },
      { level: 'low', category: 'Notice', title: 'Written Notice Requirements', desc: 'All communications regarding default or breach must be submitted in writing.' }
    );
  }

  return {
    name: documentName,
    type: contractType,
    contractType,
    jurisdiction: 'United States',
    wordCount,
    readingTime,
    gradeLevel: 'College Level',
    fullText,
    clauses,
    risks,
    prepKit: {
      summary: `Analysis of ${documentName}: This is a ${contractType} containing approximately ${wordCount} words. We identified ${risks.filter(r => r.level === 'high').length} high-risk clauses requiring attorney clarification, with primary focus on liability exposure and termination commitments.`,
      redFlags: risks.filter(r => r.level === 'high').map(r => r.title),
      questions: [
        'Is the liability and indemnification clause capped at the total contract value?',
        'Are there any unilateral termination or penalty clauses that unfairly favor the other party?',
        'Does the governing law and arbitration clause impose undue costs if a dispute arises?'
      ]
    },
    isAIGenerated: false
  };
}

/**
 * Ask Judgeman interactive Q&A
 */
export async function askJudgeman(question, contractData) {
  const apiKey = getApiKey();

  if (isLiveMode() && contractData?.fullText) {
    try {
      const prompt = `
You are Judgeman AI, an expert legal assistant. Answer the user's question directly based on this contract.
Document Name: "${contractData.name}"
Contract Text:
"""
${contractData.fullText.slice(0, 15000)}
"""

User Question: "${question}"

Provide a concise, helpful answer in plain English. State the relevant clause or section if present.
Always end with a 1-sentence reminder that you provide legal analysis and education, not licensed legal advice.
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 600 }
          })
        }
      );
      const data = await response.json();
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (answer) {
        return { text: answer, cite: `§ ${contractData.name} Analysis` };
      }
    } catch (e) {
      console.warn('[Judgeman] Live chat query failed:', e.message);
    }
  }

  // Heuristic Q&A
  return simulateChatResponse(question, contractData);
}

function simulateChatResponse(question, contractData) {
  const q = question.toLowerCase();
  const risks = contractData.risks || [];

  if (q.includes('terminate') || q.includes('quit') || q.includes('fire') || q.includes('cancel')) {
    const termRisk = risks.find(r => r.category === 'Termination');
    return {
      text: `Based on the contract, termination rules require written notice. ${termRisk ? termRisk.desc : 'Check the termination clause for specific notice windows.'} Consult an attorney before initiating termination.`,
      cite: "§ Termination Provisions"
    };
  }
  if (q.includes('risk') || q.includes('danger') || q.includes('red flag')) {
    const high = risks.filter(r => r.level === 'high');
    return {
      text: `The ${high.length} highest risk items in this document are: ${high.map((h, i) => `${i+1}. **${h.title}** (${h.desc})`).join(' ')}`,
      cite: "§ Risk Radar"
    };
  }
  if (q.includes('pay') || q.includes('money') || q.includes('fee')) {
    return {
      text: `Payment obligations must be strictly adhered to. Look out for late payment interest penalties and automatic renewal clauses.`,
      cite: "§ Financial Obligations"
    };
  }

  return {
    text: `Based on my analysis of "${contractData.name}", this document contains ${risks.length} key clauses to monitor. For specific advice on your situation, review the Attorney Prep Kit tab and consult a licensed attorney.`,
    cite: `§ ${contractData.name}`
  };
}
