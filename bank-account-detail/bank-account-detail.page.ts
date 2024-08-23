import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
  BANK_AccountProvider,
  BRA_BranchProvider,
  FINANCE_GeneralLedgerProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';

@Component({
  selector: 'app-bank-account-detail',
  templateUrl: './bank-account-detail.page.html',
  styleUrls: ['./bank-account-detail.page.scss'],
})
export class BankAccountDetailPage extends PageBase {
  ChartOfAccount = [];
  branchList;
  constructor(
    public pageProvider: BANK_AccountProvider,
    public branchProvider: BRA_BranchProvider,
    public chartOfAccountProvider: FINANCE_GeneralLedgerProvider,
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
        .read({ Skip: 0, Take: 5000, AllParent: true, Id: this.env.selectedBranchAndChildren })
    ]).then((values: any) => {
      if (values[0]) {
        lib.buildFlatTree(values[0], []).then((result: any) => {
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
      super.preLoadData(event);

    });
  }

  segmentView = 's1';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
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
}
