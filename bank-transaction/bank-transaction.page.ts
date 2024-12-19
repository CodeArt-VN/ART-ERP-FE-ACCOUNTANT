import { Location } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { AlertController, LoadingController, ModalController, NavController, PopoverController } from '@ionic/angular';
import { Subject, catchError, concat, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { lib } from 'src/app/services/static/global-functions';
import {
  BANK_AccountProvider,
  BANK_TransactionProvider,
  BRA_BranchProvider,
  CRM_ContactProvider,
} from 'src/app/services/static/services.service';

@Component({
    selector: 'app-bank-transaction',
    templateUrl: 'bank-transaction.page.html',
    styleUrls: ['bank-transaction.page.scss'],
    standalone: false
})
export class BankTransactionPage extends PageBase {
  groupControl = {
    showReorder: false,
    showPopover: false,
    groupList: [],
    selectedGroup: null,
  };
  branchList;
  itemsState: any = [];
  statusList;
  isAllRowOpened = true;
  constructor(
    public pageProvider: BANK_TransactionProvider,
    public bankProvider: BANK_AccountProvider,
    public contactProvider: CRM_ContactProvider,
    public branchProvider: BRA_BranchProvider,
    public modalController: ModalController,
    public formBuilder: FormBuilder,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public navCtrl: NavController,
    public location: Location,
  ) {
    super();
    this.pageConfig.isShowFeature = true;
    this.pageConfig.isFeatureAsMain = true;
    this.formGroup = this.formBuilder.group({
      IDBranch: [''],
      IDContact: [''],
    });
  }
  _contactDataSource = {
    searchProvider: this.contactProvider,
    loading: false,
    input$: new Subject<string>(),
    selected: [],
    items$: null,
    id: this.id,
    initSearch() {
      this.loading = false;
      this.items$ = concat(
        of(this.selected),
        this.input$.pipe(
          distinctUntilChanged(),
          tap(() => (this.loading = true)),
          switchMap((term) =>
            this.searchProvider
              .search({
                SkipMCP: term ? false : true,
                SortBy: ['Id_desc'],
                Take: 20,
                Skip: 0,
                Term: term ? term : 'BP:' + this.item?.IDCustomer,
              })
              .pipe(
                catchError(() => of([])), // empty list on error
                tap(() => (this.loading = false)),
              ),
          ),
        ),
      );
    },
  };
  preLoadData(event?: any): void {
    this.query.SortBy = 'TransactionDate_desc';
    this.selectedItems = [];
    this.statusList = [
      { Code: 'Unrecognized', Name: 'Unrecognized', Color: 'warning' },
      { Code: 'Suggested', Name: 'Suggested entry', Color: 'danger' },
      { Code: 'RecordFound', Name: 'Record found', Color: 'success' },
    ];
    
    this.pageConfig.pageIcon = 'flash-outline';
    this.branchList = lib.cloneObject(this.env.branchList);
    this.bankProvider
      .read({ Take: 5000 })
      .then((res) => {
        this.groupControl.groupList = res['data'];
        this.groupControl.groupList.forEach((g) => {
          if (g.IDParent) g._query = g.Id;
          else {
            let childrentIds = this.groupControl.groupList.filter((x) => x.IDParent === g.Id).map((x) => x.Id);
            g._query = JSON.stringify(childrentIds);
          }
        });
      })
      .catch((err) => {
        this.env.showMessage(err, 'danger');
      })
      .finally(() => {
        super.preLoadData(event);
      });
  }
  loadedData(event) {
    super.loadedData(event);
    this.items.forEach((i) => {
      i._ReconciliationStatus = this.statusList.find((d) => d.Code == i.ReconciliationStatus);
      i._BankAccount = this.groupControl.groupList.find((d) => d.Id == i.IDAccount);
    });
    this._contactDataSource.initSearch();
    this.formGroup.get('IDBranch').markAsPristine();
  }

  refresh(event?: any): void {
    this.clearData();
    this.preLoadData(event);
    //super.refresh(event);
  }

  @ViewChild('popover') popover;
  isOpenPopover = false;
  dismissPopover(apply: boolean = false) {
    if (!this.isOpenPopover) return;

    if (!apply) {
      // this.form.patchValue(this._reportConfig?.DataConfig);
    } else {
      this.submitAttempt = true;
      let obj = {
        Ids: this.selectedItems.map((s) => s.Id),
        IDBranch: this.formGroup.get('IDBranch').value,
        IDContact: this.formGroup.get('IDContact').value,
      };
      this.bankProvider.commonService
        .connect('PUT', 'BANK/Transaction/AssignBranchAndContact', obj)
        .toPromise()
        .then((res) => {
          if (res) this.env.showMessage('saved', 'success');
          this.submitAttempt = false;
        })
        .catch((err) => {
          this.env.showMessage(err, 'danger');
          this.submitAttempt = false;
        })
        .finally(() => {
          this.submitAttempt = false;
        });
    }
    this.isOpenPopover = false;
  }
  presentPopover(event) {
    this.isOpenPopover = true;
  }
  ShowAssignBranchAndBP = false;
  changeSelection(i, e = null) {
    console.log(this.formGroup);
    super.changeSelection(i, e);
    this.selectedItems?.length > 0 ? (this.ShowAssignBranchAndBP = true) : (this.ShowAssignBranchAndBP = false);
    this.selectedItems?.forEach((i) => {
      let notShowAssignBranchAndBP = ['RecordFound'];
      if (notShowAssignBranchAndBP.indexOf(i.ReconciliationStatus) > -1) {
        this.ShowAssignBranchAndBP = false;
      }
    });
  }

  FindMatchingCriteria() {
    let obj = { Ids: [] };
    if (this.selectedItems?.length > 0) obj.Ids = this.selectedItems.map((i) => i.Id);
    this.bankProvider.commonService
      .connect('PUT', 'BANK/Transaction/FindMatchingCriteria', obj)
      .toPromise()
      .then((res) => {
        if (res) this.env.showMessage('saved', 'success');
        this.submitAttempt = false;
      })
      .catch((err) => {
        this.env.showMessage(err, 'danger');
        this.submitAttempt = false;
      })
      .finally(() => {
        super.loadedData();
        this.submitAttempt = false;
      });
  }
  onGroupChange(g) {
    this.pageConfig.isSubActive = true;
    this.groupControl.selectedGroup = g;
    if (g) {
      this.query.IDAccount = g._query;
    } else {
      delete this.query.IDAccount;
    }

    this.selectedItems = [];
    if (!this.pageConfig.showSpinner) {
      this.clearData();
      this.loadData(null);
    }
  }

  changeBP(event) {
    this._contactDataSource.selected.push({ ...event });
    this.formGroup.get('IDContact').markAsPristine();
  }
  changeIDBranch() {
    this.formGroup.get('IDBranch').markAsPristine();
  }

}
