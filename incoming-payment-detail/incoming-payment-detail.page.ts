import { map } from 'rxjs/operators';

import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, ModalController, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
  BANK_IncomingPaymentDetailProvider,
  BANK_IncomingPaymentProvider,
  BRA_BranchProvider,
  CRM_ContactProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, FormControl, FormArray, Validators } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { Subject, catchError, concat, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { IncomingPaymentSaleOrderModalPage } from '../incoming-payment-sale-order-modal/incoming-payment-sale-order-modal.page';
import { IncomingPaymentInvoiceModalPage } from '../incoming-payment-invoice-modal/incoming-payment-invoice-modal.page';

@Component({
  selector: 'app-incoming-payment-detail',
  templateUrl: './incoming-payment-detail.page.html',
  styleUrls: ['./incoming-payment-detail.page.scss'],
})
export class IncomingPaymentDetailPage extends PageBase {
  statusList: [];
  SelectedOrderList: any;
  SelectedInvoiceList: any;
  constructor(
    public pageProvider: BANK_IncomingPaymentProvider,
    public IncomingPaymentDetailservice: BANK_IncomingPaymentDetailProvider,
    public branchProvider: BRA_BranchProvider,
    public env: EnvService,
    public navCtrl: NavController,
    public route: ActivatedRoute,
    public modalController: ModalController,
    public contactProvider: CRM_ContactProvider,
    public alertCtrl: AlertController,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
    public commonService: CommonService,
  ) {
    super();
    this.pageConfig.isDetailPage = true;
    this.pageConfig.canEdit = true;
    this.formGroup = formBuilder.group({
      IDBranch: [this.env.selectedBranch],
      Id: new FormControl({ value: '', disabled: true }),
      Name: [''],
      Code: [''],
      DocumentDate: [''],
      PostingDate: [''],
      DueDate: [''],
      Type: ['Cash', Validators.required],
      SubType: [''],
      Remark: [''],
      Amount: new FormControl({ value: 0, disabled: true }),
      Status: new FormControl({ value: 'Success', disabled: true }),
      IDCustomer: ['', Validators.required],
      IncomingPaymentDetails: this.formBuilder.array([]),
      IsDisabled: new FormControl({ value: '', disabled: true }),
      IsDeleted: new FormControl({ value: '', disabled: true }),
      CreatedBy: new FormControl({ value: '', disabled: true }),
      CreatedDate: new FormControl({ value: '', disabled: true }),
      ModifiedBy: new FormControl({ value: '', disabled: false }),
      ModifiedDate: new FormControl({ value: '', disabled: false }),
      DeletedFields: [[]],
    });
  }

  segmentView = 's1';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
  }

  async saveChange() {
    console.log(this.formGroup.controls.IDCustomer.value);
    let groups = <FormArray>this.formGroup.controls.IncomingPaymentDetails;
    if (groups.controls.length > 0) {
      this.formGroup.get('Type').markAsDirty();
      this.formGroup.get('Status').markAsDirty();
      this.saveChange2();
    } else {
      this.env.showTranslateMessage('Please select at least 1 order', 'warning');
    }
  }

  saveChange2(form = this.formGroup, publishEventCode = this.pageConfig.pageName, provider = this.pageProvider) {
    return new Promise((resolve, reject) => {
      this.formGroup.updateValueAndValidity();
      if (!form.valid) {
        this.env.showTranslateMessage('Please recheck information highlighted in red above', 'warning');
      } else if (this.submitAttempt == false) {
        this.submitAttempt = true;
        let submitItem = this.getDirtyValues(form);

        this.pageProvider.commonService
          .connect('POST', 'BANK/IncomingPayment/PostIncomingPayment', submitItem)
          .toPromise()
          .then((savedItem: any) => {
            resolve(savedItem);
            this.savedChange(savedItem, form);
            if (publishEventCode) this.env.publishEvent({ Code: publishEventCode });
          })
          .catch((err) => {
            this.env.showTranslateMessage('Cannot save, please try again', 'danger');
            this.cdr.detectChanges();
            this.submitAttempt = false;
            reject(err);
          });
      }
    });
  }

  typeDataSource: any;
  preLoadData(event?: any): void {
    Promise.all([this.env.getStatus('PaymentStatus'), this.env.getType('PaymentType')]).then((values: any) => {
      if (values.length) {
        this.statusList = values[0].filter((d) => d.Code != 'PaymentStatus');
        this.typeDataSource = values[1].filter((d) => d.Code == 'Cash' || d.Code == 'Card' || d.Code == 'Transfer');
      }
      super.preLoadData(event);
    });
  }
  amountOrder = 0;
  amountInvoice = 0;
  loadedData(event?: any, ignoredFromGroup?: boolean): void {
    if (this.item?.Status == 'Success') {
      this.pageConfig.canEdit = false;
    }
    super.loadedData(event, ignoredFromGroup);
    this.query.IDIncomingPayment = this.item.Id;
    this.query.Id = undefined;
    this.IncomingPaymentDetailservice.read(this.query, false).then((listIPDetail: any) => {
      if (listIPDetail != null && listIPDetail.data.length > 0) {
        const IncomingPaymentDetailsArray = this.formGroup.get('IncomingPaymentDetails') as FormArray;
        IncomingPaymentDetailsArray.clear();
        this.item.IncomingPaymentDetails = listIPDetail.data;
        this.item.IncomingPaymentDetails.forEach((detail) => {
          if (detail.IDSaleOrder && detail.IDInvoice == null) {
              this.amountOrder += detail.Amount;
          }
          if (detail.IDInvoice) {
              this.amountInvoice += detail.Amount;
          }
        });
        this.patchFieldsValue();
      }
    });
    this._contactDataSource.initSearch();
  }

  sortDetail: any = {};
  sortToggle(field) {
    if (!this.sortDetail[field]) {
      this.sortDetail[field] = field;
    } else if (this.sortDetail[field] == field) {
      this.sortDetail[field] = field + '_desc';
    } else {
      delete this.sortDetail[field];
    }

    if (Object.keys(this.sortDetail).length === 0) {
      this.refresh();
    } else {
      this.reInitIncomingPaymentCountDetails();
    }
  }

  reInitIncomingPaymentCountDetails() {
    const IncomingPaymentDetailsArray = this.formGroup.get('IncomingPaymentDetails') as FormArray;
    this.item.IncomingPaymentDetails = IncomingPaymentDetailsArray.getRawValue();
    for (const key in this.sortDetail) {
      if (this.sortDetail.hasOwnProperty(key)) {
        const value = this.sortDetail[key];
        this.sortByKey(value);
      }
    }
    IncomingPaymentDetailsArray.clear();
    this.item.IncomingPaymentDetails.forEach((s) => this.addField(s));
  }

  sortByKey(key: string, desc: boolean = false) {
    if (key.includes('_desc')) {
      key = key.replace('_desc', '');
      desc = true;
    }
    this.item.IncomingPaymentDetails.sort((a, b) => {
      const comparison = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
      return desc ? -comparison : comparison;
    });
  }

  private patchFieldsValue() {
    this.pageConfig.showSpinner = true;
    this.formGroup.controls.IncomingPaymentDetails = new FormArray([]);
    if (this.item.IncomingPaymentDetails?.length) {
      this.item.IncomingPaymentDetails.forEach((i) => this.addField(i));
    }
    this.pageConfig.showSpinner = false;
  }

  addField(field: any, markAsDirty = false) {
    let groups = <FormArray>this.formGroup.controls.IncomingPaymentDetails;
    let group = this.formBuilder.group({
      IDIncomingPayment: [this.item.Id],
      Id: new FormControl({ value: field.Id, disabled: false }),
      IDSaleOrder: new FormControl({ value: field.IDSaleOrder, disabled: false }),
      IDCustomer: new FormControl({ value: field.IDCustomer, disabled: false }),
      IDInvoice: new FormControl({ value: field.IDInvoice, disabled: false }),
      Name: new FormControl({ value: field.Name, disabled: false }),
      Remark: new FormControl({ value: field.Remark, disabled: false }),
      Amount: new FormControl({ value: field.Amount, disabled: false }),
    });
    groups.push(group);
    group.get('IDIncomingPayment').markAsDirty();
    group.get('Id').markAsDirty();
    group.get('IDSaleOrder').markAsDirty();
    group.get('IDCustomer').markAsDirty();
    group.get('IDInvoice').markAsDirty();
    group.get('Name').markAsDirty();
    group.get('Remark').markAsDirty();
    group.get('Amount').markAsDirty();
    this.formGroup.get('IncomingPaymentDetails').markAsDirty();
  }

  changeType(e) {
    this.formGroup.get('Type').setValue(e.Code);
    this.formGroup.get('Type').markAsDirty();
    this.saveChange();
  }

  incomingPaymentOrderDetails: any;
  async showOrderModal() {
    this.incomingPaymentOrderDetails = [...this.formGroup.controls.IncomingPaymentDetails.value];
    this.SelectedOrderList = this.formGroup.controls.IncomingPaymentDetails?.value;
    const modal = await this.modalController.create({
      component: IncomingPaymentSaleOrderModalPage,
      componentProps: {
        IDContact: this.formGroup.controls.IDCustomer.value,
        amount: this.amountOrder,
        SelectedOrderList: this.SelectedOrderList,
      },
      cssClass: 'modal90',
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();
    this.SelectedOrderList = [];
    if (data && data.length) {
      // this.formGroup.removeControl('IncomingPaymentDetails');
      // let groups = this.formBuilder.array([]);
      // this.formGroup.addControl('IncomingPaymentDetails', groups);
      let deletedFields = [];
      let dataIds = [];
      for (let i = 0; i < data.length; i++) {
        const e = data[i];
        this.SelectedOrderList.push(e);
        if (!this.incomingPaymentOrderDetails.some(item => item.IDSaleOrder === e.IDSaleOrder)) {
          this.addField(e);
        }
        //this.addField(e);
        dataIds = data.map((e) => e.IDSaleOrder);
      }
      this.incomingPaymentOrderDetails.forEach((x) => {
        if (!dataIds.includes(x.IDSaleOrder) && x.IDInvoice == null) {
          deletedFields.push(x.Id);
        }
      });
      if (deletedFields.length && this.formGroup.controls.Id.value) {
        this.removeField(deletedFields);
      }
      this.formGroup.get('Amount').setValue(data.Amount + this.amountInvoice);
      this.formGroup.get('Amount').markAsDirty();
    }
    if (this.formGroup.valid) {
      //this.saveChange();
    }
  }

  async showInvoiceModal() {
    this.incomingPaymentOrderDetails = [...this.formGroup.controls.IncomingPaymentDetails.value];
    this.SelectedInvoiceList = this.formGroup.controls.IncomingPaymentDetails?.value;
    const modal = await this.modalController.create({
      component: IncomingPaymentInvoiceModalPage,
      componentProps: {
        IDBusinessPartner: this.formGroup.controls.IDCustomer.value,
        amount: this.amountInvoice,
        SelectedInvoiceList: this.SelectedInvoiceList,
      },
      cssClass: 'modal90',
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();
    this.SelectedInvoiceList = [];
    if (data && data.length) {
      // this.formGroup.removeControl('IncomingPaymentDetails');
      // let groups = this.formBuilder.array([]);
      // this.formGroup.addControl('IncomingPaymentDetails', groups);
      let deletedFields = [];
      let dataIds = [];
      for (let i = 0; i < data.length; i++) {
        const e = data[i];
        this.SelectedInvoiceList.push(e);
        e.IDSaleOrder = null;
        if (!this.incomingPaymentOrderDetails.some(item => item.IDInvoice === e.IDInvoice)) {
          this.addField(e);
        }
        //this.addField(e);
        dataIds = data.map((e) => e.IDInvoice);
      }
      this.incomingPaymentOrderDetails.forEach((x) => {
        if (!dataIds.includes(x.IDInvoice) && x.IDSaleOrder == null) {
          deletedFields.push(x.Id);
        }
      });
      if (deletedFields.length && this.formGroup.controls.Id.value) {
        this.removeField(deletedFields);
      }
      this.formGroup.get('Amount').setValue(data.Amount + this.amountOrder);
      this.formGroup.get('Amount').markAsDirty();
    }
    if (this.formGroup.valid) {
      //this.saveChange();
    }
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

  removeField(deletedFields) {
    this.formGroup.get('DeletedFields').setValue(deletedFields);
    this.formGroup.get('DeletedFields').markAsDirty();
  }
}
