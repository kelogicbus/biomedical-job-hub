# Job Data Refresh Prompt

Paste this into a new Cowork session to get fresh job data:

---

Search for the latest biomedical research job postings for new graduates in the NYC and NJ area. Cover these sources: Indeed, Glassdoor, LinkedIn, ZipRecruiter, and institutional career pages (Rockefeller, Columbia, Mount Sinai, NYU Langone, Weill Cornell, Princeton, Rutgers, BMS, Merck, Regeneron, Novartis, Amgen, IQVIA, J&J).

Focus on entry-level roles in: Molecular & Cell Biology, Neuroscience, Immunology / Immuno-oncology, Clinical Trials / CRO, Drug Discovery & Pharmacology, Tissue Engineering / Regen Med, Bioinformatics / Computational, Quality Control / Regulatory, Medical Devices / Biomaterials, Public Health / Epidemiology.

For each job found, output valid JSON matching this schema:
```json
{
  "id": <number>,
  "title": "<string>",
  "company": "<string>",
  "lab": "<string or null>",
  "location": "<City, ST>",
  "region": "NYC" or "NJ",
  "jobType": "Full-time" | "Internship" | "Co-op" | "Externship" | "Contract",
  "category": "<one of the 10 categories above>",
  "employerType": "Academic" | "Pharma" | "Medical Center" | "Biotech Startup" | "CRO" | "Government",
  "salary": "<display string>",
  "salaryMin": <number, annual>,
  "salaryMax": <number, annual>,
  "description": "<string>",
  "requirements": ["<string>", ...],
  "posted": "YYYY-MM-DD",
  "link": "<url>",
  "source": "Indeed" | "Glassdoor" | "LinkedIn" | "Direct"
}
```

Output the complete JSON array. I will replace `data/jobs.json` in my project with this file, then run `git add data/jobs.json && git commit -m "refresh jobs" && git push` to deploy.

---

After Claude gives you the JSON file, save it and replace `data/jobs.json` in your project folder.
