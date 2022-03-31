import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {environment} from "../environments/environment";
import {lastValueFrom} from "rxjs";

@Injectable({
  providedIn: 'root'
})

export class ApiService {

  constructor(private http: HttpClient) {
  }

  async post(path: string, data: any): Promise<any> {
    return await lastValueFrom(this.http.post(environment.platformApi + path, data));
  }

  async get(path: string): Promise<any> {
    return await lastValueFrom(this.http.get(environment.platformApi + path));
  }


  async checkKey(key: string): Promise<any | null> {
    try {
      return await this.get(`getAccountsByKey/${key}`);
    } catch (e: any) {
      console.log(e);
      return {
        status: false,
        error: e.message
      };
    }
  }

  async createAccount(data: any): Promise<any | null> {
    try {
      return await this.post(`createAccount`, data);
    } catch (e: any) {
      return {
        status: false,
        error: e.message
      };
    }
  }

  async issueTokens(data: any): Promise<any | null> {
    try {
      return await this.post(`issueTokens`, data);
    } catch (e: any) {
      return {
        status: false,
        error: e.error.error
      };
    }
  }

  async getBalance(_account: any) {
    try {
      const result = await this.get('balance/' + _account);
      if (result.status) {
        return result.data;
      } else {
        return "";
      }
    } catch (e) {
      console.log(e);
      return "";
    }
  }
}
