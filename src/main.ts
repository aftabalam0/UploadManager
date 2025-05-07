import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import { sendData } from './app';
import { Encrypt } from './encryption';
import { validateViaQueryMaster } from './validation'; 
import { config } from './config';


interface ExcelRow {
  [key: string]: any;
  CompanyName?: string;
  Officers?: any[];
}

const TOKEN = config.token!;
const USERNAME = config.username!;
const ENCRYPTED_TOKEN = Encrypt(TOKEN, USERNAME);

// File paths
const COMPANY_FILE_PATH = path.resolve(__dirname, 'data', 'Left - CompanyData.xlsx');
const OFFICER_FILE_PATH = path.resolve(__dirname, 'data', 'OfficerData.xlsx');
const FAILURE_LOG_PATH = path.resolve(__dirname, 'failures_log.json');


async function main() {
  try {
    const companies = readExcelFile(COMPANY_FILE_PATH);
    const officers = readExcelFile(OFFICER_FILE_PATH);

    const startIndex = 0; 

    for (let i = startIndex; i <= companies.length; i++) {
    
      const company = companies[i];
      
      if(!company?.CompanyName) continue;

      const companyId = await validateViaQueryMaster({
        userId: 153,
        fieldValue: company.ScrapingFor ? company.ScrapingFor : "",
        tokenReceived: ENCRYPTED_TOKEN
      });


      if (companyId===0) {
        console.error(`Skipping: Company not validated — ${company.ScrapingFor}`);
        logFailure({
          type: "validation",
          index: i,
          name: company.ScrapingFor,
          message: "Company validation failed"
        });
        continue;
      }
      if (!company?.CompanyName || !company.RegisteredOfficeAddress || !company.CompanyStatus) continue;

      const city = getCityFromAddress(company.RegisteredOfficeAddress);
      const statusValue = mapCompanyStatus(company.CompanyStatus);

      const companyValues = [
        // { Key: "name", Value: company.CompanyName },
        { Key: "companynumber", Value: company.CompanyNumber },
        { Key: "incorporatedon", Value: formatDate(company.IncorporationDate) },
        { Key: "country", Value: "United Kingdom" },
        { Key: "address1_city", Value: city },
        { Key: "address", Value: company.RegisteredOfficeAddress },
        { Key: "company_status", Value: statusValue }
      ];

      console.log(`(${i}) Sending company data: ${company.CompanyName}`);

      const response = await sendData(companyId, companyValues, "Accounts", ENCRYPTED_TOKEN);

      if (response.ResponseCode !== 0) {
        console.error(`Company failed: ${company.CompanyName}, Code: ${response.responseCode}`);
        logFailure({
          type: "company",
          index: i,
          name: company.ScrapingFor,
          code: response.responseCode,
          response
        });
        console.log("Stopping due to failure.");
        break; // stop everything
      }

      const accountId = response.Result;
      console.log("Company data sent successfully.");

      

      const companyOfficers = officers.filter(o => o.CompanyName === company.CompanyName);
      for (const officer of companyOfficers) {
        if (!officer?.OfficerName || !officer.OfficerRole) continue;

        const officerValues = [
          { Key: "name", Value: officer.OfficerName },
          { Key: "accountreference", Value: accountId },
          { Key: "job_title", Value: officer.OfficerRole }
        ];

        console.log(`Sending officer: ${officer.OfficerName}`);

        const officerResponse = await sendData(0, officerValues, "Contacts", ENCRYPTED_TOKEN);

        if (officerResponse.ResponseCode !== 0) {
          console.error(`Officer failed: ${officer.OfficerName}, Code: ${officerResponse.responseCode}`);
          logFailure({
            type: "officer",
            companyIndex: i,
            companyName: company.CompanyName,
            officerName: officer.OfficerName,
            code: officerResponse.responseCode,
            response: officerResponse
          });
          
        } else {
          console.log("Officer data sent successfully.");
        }
      }
    }
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

function readExcelFile(filePath: string): ExcelRow[] {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet);
}


function getCityFromAddress(address: string): string {
  const parts = address.split(',').map(part => part.trim());
  if (parts.length < 2) return '';
  if (parts.includes('England') || parts.includes('Wales') || parts.includes('Northern Ireland') || parts.includes('Scotland')) {
    return parts[parts.length - 3];
  }
  return parts[parts.length - 2];
}

function mapCompanyStatus(status: string): number {
  const normalized = status.toLowerCase();
  if (normalized === 'dissolved') return 3;
  if (normalized.includes('proposal to strike off')) return 2;
  if (normalized.includes('administration')) return 4;
  return 1;
}

function formatDate(dateValue: any): string {
  if (typeof dateValue === 'string') return dateValue;

  if (typeof dateValue === 'number') {
    const parsedDate = XLSX.SSF.parse_date_code(dateValue);
    if (!parsedDate) return '';
    const { y, m, d } = parsedDate;
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    return `${d} ${monthNames[m - 1]} ${y}`;
  }

  return '';
}


function logFailure(entry: any) {
  let failures = [];
  try {
    if (fs.existsSync(FAILURE_LOG_PATH)) {
      const raw = fs.readFileSync(FAILURE_LOG_PATH, 'utf8');
      failures = JSON.parse(raw);
    }
  } catch (e) {
    console.error("Error reading failure log:", e);
    failures = [];
  }

  failures.push(entry);

  try {
    fs.writeFileSync(FAILURE_LOG_PATH, JSON.stringify(failures, null, 2), 'utf8');
  } catch (e) {
    console.error("Error writing failure log:", e);
  }
}


(async () => {
  await main();
})();
