import axios from 'axios';
import { config } from './config';

interface ValidationInput {
  userId: number;
  fieldValue: string;
  tokenReceived?: string;
}

interface QueryMasterResponse {
    ResponseCode: number;
    Result: {
      Table: Array<{
        ID: number;
        [key: string]: any;
      }>;
    };
    Message: string;
  }

export async function validateViaQueryMaster(input: ValidationInput) {
  const params = {
    UserID: input.userId,
    GUID: config.GUID,
    fieldValue: input.fieldValue,
    tokenReceived: input.tokenReceived
  };


  const url = config.baseUrl+`QueryMasterModule/API/Feature/GetQueryResultForApp?UserID=${params.UserID}&GUID=${params.GUID}&fieldValue=${encodeURIComponent(params.fieldValue)}&tokenReceived=${params.tokenReceived}`;

  console.log("URL:", url);

  try {
    const response = await axios.get<QueryMasterResponse>(url);
    console.log("Response:", response.data.Result);
    return response.data.Result.Table[0]?.ID ?? 0;
  } catch (error) {
    console.error("API call failed:", error);
    return 0;
  }
}

