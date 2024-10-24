import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
  BANK_AccountProvider,
  BRA_BranchProvider,
  FINANCE_GeneralLedgerProvider,
  LIST_BankProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, ValidatorFn, ValidationErrors, AbstractControl } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';

@Component({
  selector: 'app-bank-account-detail',
  templateUrl: './bank-account-detail.page.html',
  styleUrls: ['./bank-account-detail.page.scss'],
})
export class BankAccountDetailPage extends PageBase {
  ChartOfAccount = [];
  collectionSchedule:any = [];
  accountList = []
  bankList = []
  branchList;
  constructor(
    public pageProvider: BANK_AccountProvider,
    public branchProvider: BRA_BranchProvider,
    public list_BankProvider: LIST_BankProvider,
    public chartOfAccountProvider: FINANCE_GeneralLedgerProvider,
    public accountProvider: BANK_AccountProvider,
    public env: EnvService,
    public navCtrl: NavController,
    public route: ActivatedRoute,
    public alertCtrl: AlertController,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
    public commonService: CommonService,
  ) {
    super();
    this.pageConfig.isDetailPage = true;
    this.formGroup = formBuilder.group({
      IDBranch: [this.env.selectedBranch],
      Id: new FormControl({ value: '', disabled: true }),
      IDBank: [''],
      IDParent: [''],
      Code: [''],
      Name: ['', Validators.required],
      Remark: [''],
      Sort: [''],
      Product: [''],
      Type: [''],
      SWIFT: [''],
      Currency: [''],
      WorkingBalance: [''],
      LastCheckedDate: [''],
      NextCheckNo: [''],
      //-----------------
      GLAccount: [''],
      DebtOfDiscountedBoEAccount: [''],
      BankOnCollectionAccount: [''],
      BankOnDiscounted: [''],
      GLInterimAccount: [''],
      FineAccount: [''],
      InterestAccount: [''],
      DiscountAccount: [''],
      ServiceFeeAccount: [''],
      OtherExpensesAccount: [''],
      OtherIncomesAccount: [''],
      //-------------------------
      IsLoanAccount: [''],
      IsInDue: [''],
      FixedPeriod: [''],
      InterestRate: [''],
      CurentInterestRate: [''],
      IsStepdownInterestRateScheme: [''],
      IsEarlyRepayment: [''],
      LoanTenor: [''],
      DisbursementDate: [''],
      EndDate: [''],
      IDAccountDebtCollection: [''],
      TotalOutstandingLoans: [''],
      PrincipalPaid: [''],

      //-------------------------
      IsDisabled: new FormControl({ value: '', disabled: true }),
      IsDeleted: new FormControl({ value: '', disabled: true }),
      CreatedBy: new FormControl({ value: '', disabled: true }),
      CreatedDate: new FormControl({ value: '', disabled: true }),
      ModifiedBy: new FormControl({ value: '', disabled: true }),
      ModifiedDate: new FormControl({ value: '', disabled: true }),
    });
  }
  preLoadData(event?: any): void {
    Promise.all([
      this.chartOfAccountProvider.commonService
        .connect('GET', 'FINANCE/GeneralLedger/', {
          Keyword: '',
          Take: 5000,
          AllChildren: true,
          AllParent: true,
        })
        .toPromise(),
        this.branchProvider
        .read({ Skip: 0, Take: 5000, AllParent: true, Id: this.env.selectedBranchAndChildren }),
        this.list_BankProvider.read({Take:5000})
    ]).then((values: any) => {
      if (values[0]) {
        lib.buildFlatTree(values[0], []).then((result: any) => {
          result.forEach(i=> {
            let parent = result.find(d => d.IDParent == i.Id);
            if(parent){
              i.disabled = true;
            }
          });
          this.ChartOfAccount = result;
        });
      }
      if(values[1]){
        lib .buildFlatTree(values[1]['data'], this.branchList).then((result: any) => {
          this.branchList = result;
          this.branchList.forEach((i) => {
            i.disabled = true;
          });
          this.markNestedNode(this.branchList, this.env.selectedBranch);
        })
      }
      if(values[2]){
        this.bankList = values[2].data;
      }
      super.preLoadData(event);

    });
  }
  loadedData(event=null){
    super.loadedData(event);
    let rs = this.getBranchAndChildren(this.item.IDBranch,[]);
    this.accountProvider
    .read({ Skip: 0, Take: 5000,ID_ne:this.item.Id, Id: this.formGroup.get('IDParent').value, AllChildren:true}).then((values: any) => {
      if(values && values.data?.length){
        this.accountList = values.data.filter(d=> !d.IsLoanAccount && d.Id != this.formGroup.get('IDParent').value && d.Id != this.formGroup.get('Id').value);
        console.log(this.accountList);
      }
      this.setValidatorLoanAccount();

    });
    
    
  }
  getBranchAndChildren(id,result = []){
    let it = this.branchList.find(d=> d.Id == id);
    if(it) {
      result.push(it.Id);
      let children = [...this.branchList.filter(d=> d.IDParent == it.Id)]
      children.forEach(c => {
        this.getBranchAndChildren(c.Id,result);
      })

    }
    return result;
  }
  segmentView = 's1';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
    if(this.segmentView == 's3'){
      if(this.formGroup.get('LoanTenor').value &&this.formGroup.get('InterestRate').value && this.formGroup.get('TotalOutstandingLoans').value && this.formGroup.get('DisbursementDate').value  )
        {
          let query = {Id:this.formGroup.get('Id').value};
          this.pageProvider.commonService.connect('GET','BANK/Account/GetCollectionSchedule',query).toPromise().then((rs)=>{
            console.log(rs);
            this.collectionSchedule = rs;
          }).catch(err=>{
            console.log(err);
            
          })
        }
    
    }
  }

  async saveChange() {
    super.saveChange2();
  }
  markNestedNode(ls, Id) {
    ls.filter((d) => d.IDParent == Id).forEach((i) => {
      if (i.Type != 'TitlePosition') i.disabled = false;
      this.markNestedNode(ls, i.Id);
    });
  }
  setValidatorLoanAccount(){
    if(this.formGroup.get('IsLoanAccount').value){
      this.formGroup.get('LoanTenor').setValidators([Validators.required,this.greaterThanZeroValidator]);
    //  this.formGroup.get('FixedPeriod').setValidators([Validators.required,this.greaterThanZeroValidator]);
      this.formGroup.get('InterestRate').setValidators([Validators.required,this.greaterThanZeroValidator]);
      this.formGroup.get('TotalOutstandingLoans').setValidators([Validators.required,this.greaterThanZeroValidator]);
      this.formGroup.get('CurentInterestRate').setValidators([Validators.required,this.greaterThanZeroValidator]);
    }
    else{
      this.formGroup.get('LoanTenor').setValidators([]);
 //     this.formGroup.get('FixedPeriod').setValidators([]);
      this.formGroup.get('InterestRate').setValidators([]);
      this.formGroup.get('TotalOutstandingLoans').setValidators([]);
      this.formGroup.get('CurentInterestRate').setValidators([]);
    }
    this.formGroup.get('LoanTenor').updateValueAndValidity();
    this.formGroup.get('CurentInterestRate').updateValueAndValidity();
    this.formGroup.get('InterestRate').updateValueAndValidity();
    this.formGroup.get('TotalOutstandingLoans').updateValueAndValidity();

  }
  isLoanAccountChange(){
    this.setValidatorLoanAccount();
    this.saveChange();
  }

  greaterThanZeroValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    return value > 0 ? null : { greaterThanZero: true };
  }
  searchByNameCode = (term: string, item: any) => {
    term = term.toLowerCase();
    return item.Name.toLowerCase().includes(term) || 
          item.Code.toLowerCase().includes(term);  
  };
}
