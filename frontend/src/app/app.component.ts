import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, ViewChild} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {faRotateRight} from "@fortawesome/free-solid-svg-icons/faRotateRight";
import {faCircleExclamation} from "@fortawesome/free-solid-svg-icons/faCircleExclamation";
import {faClone} from "@fortawesome/free-solid-svg-icons/faClone";
import {MatSnackBar} from "@angular/material/snack-bar";
import {faArrowLeftLong} from "@fortawesome/free-solid-svg-icons/faArrowLeftLong";
import {faArrowUpRightFromSquare} from "@fortawesome/free-solid-svg-icons/faArrowUpRightFromSquare";
import {ApiService} from "../services/api.service";
import {environment} from "../environments/environment";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  public accountForm: FormGroup;
  public issueTokenForm: FormGroup;
  accountSuccess: boolean = false;
  issueTokenSuccess: boolean = false;
  accountErr = '';
  issueTokenErr = '';
  accountSending = false;
  issueTokenSending = false;

  accCreatorBack = false;
  faucetBack = false;

  googleReCaptcha!: {
    render: (element: HTMLElement, options: {
      sitekey?: string;
      theme?: string;
      size?: string;
      'expired-callback'?: () => void;
      'error-callback'?: (error: any) => void;
      callback: (token: string) => void;
    }) => void
  }

  icons = {
    solid: {
      rotate: faRotateRight,
      circleExclamation: faCircleExclamation,
      clone: faClone,
      arrowLeftLong: faArrowLeftLong,
      externalLink: faArrowUpRightFromSquare,
    }
  }
  selectedTab = 0;

  serverApi = environment.platformApi;

  @ViewChild('captchaRef2') captchaRef2!: ElementRef;
  @ViewChild('captchaRefFaucet') captchaRefFaucet!: ElementRef;
  private SITE_ID = environment.recaptchaKey;
  private googleReCaptchaResponse = '';
  recaptchaErr = '';
  createdAccount = '';
  contractError = '';
  issueTransaction = '';
  updatedBalance = '';

  constructor(private fb: FormBuilder, private _snackBar: MatSnackBar,
              public api: ApiService,
              private cdr: ChangeDetectorRef) {
    this.accountForm = this.fb.group({
      ownerPublic: ['', [Validators.required]],
      activePublic: [''],
      recaptcha: ['', [Validators.required]]
    });
    this.issueTokenForm = this.fb.group({
      account: ['', [
        Validators.required,
        // Validators.pattern('1[a-z]{2}2[a-z]{2}3[a-z]{2}4[a-z]{2}')
      ]],
      recaptcha: ['', [Validators.required]]
    });
    const savedTab = localStorage.getItem('tab');
    if (savedTab) {
      this.selectedTab = parseInt(savedTab, 10);
    }

  }

  ngAfterViewInit() {

    const js = document.createElement('script') as HTMLScriptElement;
    js.id = 'reCaptchaV2'
    js.src = "https://www.google.com/recaptcha/api.js?onload=onloadCallback&render=explicit"
    js.async = true;

    document.head.append(js);

    // @ts-ignore
    window["onloadCallback"] = () => {
      if (this.selectedTab === 0) {
        this.renderCaptcha(this.captchaRef2.nativeElement)
      } else {
        this.renderCaptcha(this.captchaRefFaucet.nativeElement)
      }
    };
  }

  renderCaptcha(element: HTMLElement) {
    this.googleReCaptcha = (window as any).grecaptcha;
    this.googleReCaptcha.render(element, {
      'sitekey': this.SITE_ID,
      'theme': 'light',
      'callback': (response: any) => this.reCaptchaSuccess(response),
      'expired-callback': () => this.reCaptchaExpired(),
      "error-callback": error => {
        console.log(error);
        this.recaptchaErr = 'e';
      }
    });
  }

  reCaptchaSuccess(data: string) {
    if (data) {
      this.accountForm.get('recaptcha')?.setValue(data);
      this.issueTokenForm.get('recaptcha')?.setValue(data);
      this.cdr.detectChanges();
      this.googleReCaptchaResponse = data;
      this.recaptchaErr = '';
    }
  }

  reCaptchaExpired() {
    this.googleReCaptchaResponse = '';
    this.accountForm.get('recaptcha')?.reset();
    this.issueTokenForm.get('recaptcha')?.reset();
    this.cdr.detectChanges();
    this.recaptchaErr = '';
  }

  async checkBalance() {
    const _account = this.issueTokenForm.get('account')?.value.trim();
    this.updatedBalance = await this.api.getBalance(_account);
  }


  async createAcc(): Promise<void> {
    if (this.accountForm.valid) {
      this.accountSending = true;
      const response = await this.api.createAccount({
        ownerKey: this.accountForm.get('ownerPublic')?.value.trim(),
        activeKey: this.accountForm.get('activePublic')?.value.trim(),
        captcha: this.googleReCaptchaResponse
      });
      if (response.status) {
        if (response.data.error) {
          this.accountErr = 'contract_error';
          this.contractError = response.data.error;
          this.accountSuccess = false;
        } else {
          if (response.data.accounts && response.data.accounts.length > 0) {
            this.createdAccount = response.data.accounts[0];
            this.accountErr = '';
            this.accountSuccess = true;
            this.contractError = '';
            if (this.accountSuccess) {
              this.accCreatorBack = false;
            }
          } else {
            this.accountErr = 'cannot_recover_account';
          }
        }
      } else {
        this.accountErr = 'e';
        this.accountSuccess = false;
      }
    }
    this.accountSending = false;
  }

  async issueTokens(): Promise<void> {
    if (this.issueTokenForm.valid) {
      this.issueTokenSending = true;
      const _account = this.issueTokenForm.get('account')?.value.trim();
      const response = await this.api.issueTokens({
        account: _account,
        captcha: this.googleReCaptchaResponse
      });
      if (response.status) {
        if (response.data.error) {
          this.issueTokenErr = 'contract_error';
          this.contractError = response.data.error;
          this.issueTokenSuccess = false;
        } else {
          if (response.data.transaction_id) {
            this.issueTransaction = response.data.transaction_id;

            this.updatedBalance = await this.api.getBalance(_account);

            this.issueTokenErr = '';
            this.contractError = '';
            this.issueTokenSuccess = true;
            if (this.issueTokenSuccess) {
              this.faucetBack = false;
            }
          } else {
            this.issueTokenErr = 'e';
          }
        }
      } else {
        this.issueTokenErr = response.error;
        this.issueTokenSuccess = false;
      }
    }
    this.issueTokenSending = false;
  }

  cc(text: string): void {
    window.navigator.clipboard.writeText(text).then(() => {
      this.openSnackBar('Account copied to clipboard', 'Ok', 'mat-primary');
    }).catch(() => {
      this.openSnackBar('Something went wrong! Please, try copying another way', 'Ok', 'mat-warn');
    });
  }

  openSnackBar(message: string, action: string, color: string): void {
    this._snackBar.open(message, action, {
      duration: 5000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['mat-toolbar', color]
    });
  }

  renderCaptchaWithDelay(elementName: string, time: number) {
    const element: ElementRef<HTMLElement> = (this as any)[elementName];
    setTimeout(() => {
      if (element && element.nativeElement) {
        this.renderCaptcha(element.nativeElement);
      } else {
        this.renderCaptchaWithDelay(elementName, time);
      }
    }, time);
  }

  setItem(idx: number) {
    localStorage.setItem('tab', idx.toString());
    if (idx === 0) {
      this.renderCaptchaWithDelay('captchaRef2', 100);
    } else {
      this.renderCaptchaWithDelay('captchaRefFaucet', 100);
    }
  }

  accBack() {
    this.accountSuccess = false;
    this.accCreatorBack = true;
    this.contractError = '';
    this.accountForm.reset();
    this.renderCaptchaWithDelay('captchaRef2', 100);
  }

  tokenFaucetBack() {
    this.issueTokenSuccess = false;
    this.faucetBack = true;
    this.issueTokenErr = '';
    this.contractError = '';
    this.updatedBalance = '';
    this.issueTokenForm.reset();
    this.renderCaptchaWithDelay('captchaRefFaucet', 100);
  }

  async checkKey(key: any): Promise<void> {
    if (key.valid) {
      const response = await this.api.checkKey(key.value.trim());
      if (response.status) {
        if (response.data.length > 0) {
          this.accountErr = 'key_already_used';
          key.setErrors({incorrect: true});
        } else {
          this.accountErr = '';
          key.setErrors(null);
        }
      } else {
        if (key.value === '') {
          key.markAsPristine();
          if (this.accountForm.get('ownerPublic')?.valid) {
            this.accountErr = '';
          }
        } else {
          key.setErrors({incorrect: true});
          this.accountErr = 'invalid_key';
        }
      }
    }
  }
}
