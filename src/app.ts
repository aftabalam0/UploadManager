import axios from 'axios';
import { config } from './config';

const userID = config.userId;
const url = config.baseUrl+'DataTablesGridModule/API/DataOperations/SaveUpdateRecord';

interface ValuePair {
  Key: string;
  Value: string;
}

export const sendData = async (Id:any,values: any[], objectName: string, token: string) => {
  const payload = {
    Token: token,
    UserID: userID,
    db_Obj: {
      ID: Id==0?-1:Id,
      connectionString: null,
      Pk_ColumnName: "Id",
      ObjectName: objectName,
      Values: values,
      RecordInfo: null,
      ObjuserInfo: null,
    }
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });
    console.log("Response:", response.data);
    return response.data;
   
  } catch (error: any) {
    if (error.response) {
      console.error("Error:", error.response.data);
      return error.response.data;
    }
  }
};
