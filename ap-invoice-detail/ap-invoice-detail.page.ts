import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
  AC_APInvoiceProvider,
  BRA_BranchProvider,
  PURCHASE_OrderProvider,
  WMS_ReceiptProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'app-ap-invoice-detail',
  templateUrl: './ap-invoice-detail.page.html',
  styleUrls: ['./ap-invoice-detail.page.scss'],
})
export class APInvoiceDetailPage extends PageBase {
  statusList = [];
  constructor(
    public pageProvider: AC_APInvoiceProvider,
    public receiptProvider: WMS_ReceiptProvider,
    public purchaseOrderProvider: PURCHASE_OrderProvider,
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
      Name: [''],
      Remark: [''],
      Sort: [''],
      IsDisabled: new FormControl({ value: '', disabled: true }),
      IsDeleted: new FormControl({ value: '', disabled: true }),
      CreatedBy: new FormControl({ value: '', disabled: true }),
      CreatedDate: new FormControl({ value: '', disabled: true }),
      ModifiedBy: new FormControl({ value: '', disabled: true }),
      ModifiedDate: new FormControl({ value: '', disabled: true }),
      ////////
      IDPurchaseOrder: [''],
      IDReceipt: [''],
      IDSeller: [''],
      IDBuyer: [''],
      IDOwner: [''],

      RefSO: [''],
      RefCode: [''],

      ////////
      Type: [''],
      Status: [''],

      InvoiceForm: [''],
      InvoiceSerial: [''],
      InvoiceNo: ['',Validators.required],
      InvoiceGUID: [''],
      InvoiceCode: [''],
      InvoiceURL: [''],
      InvoiceDate: ['',Validators.required],
      InvoiceSignedDate: [''],

      TotalBeforeDiscount: ['',Validators.required],
      TotalDiscount: ['',Validators.required],
      CalcTotalAfterDiscount: new FormControl({
        value: 0,
        disabled: true,
      }),
      Tax: ['',Validators.required],
      WithholdingTax: [0],
      CalcTotalAfterTax: new FormControl({ value: 0, disabled: true }),

      ////////
      Paid: new FormControl({ value: 0, disabled: true }),
      CalcBalance: new FormControl({ value: 0, disabled: true }),

      DueDate: [''],
      Currency: [''],
      ExchangeRate: [''],

      ////////
      SellerName: [''],
      SellerTaxCode: [''],
      SellerUnitName: [''],
      SellerAddress: [''],
      SellerBankAccount: [''],
      SellerPhone: [''],
      SellerEmail: [''],

      ////////
      BuyerName: [''],
      BuyerTaxCode: [''],
      BuyerAddress: [''],
    });
  }

  preLoadData(event?: any): void {
    this.env.getStatus('APInvoice').then((result) => {
      this.statusList = result;
      super.preLoadData();
    });
  }

  loadedData(event?: any, ignoredFromGroup?: boolean): void {
    if (this.item.Id) {
      this.item.InvoiceDate = lib.dateFormat(this.item.InvoiceDate);
      this.item.InvoiceSignedDate = lib.dateFormat(this.item.InvoiceSignedDate);
    }
    super.loadedData(event, ignoredFromGroup);
    this.IDReceiptDataSource.initSearch();
    this.IDPurchaseOrderDataSource.initSearch();
  }

  segmentView = 's1';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
  }

  async saveChange() {
    let rvalue = this.formGroup.getRawValue();

    this.item.CalcTotalAfterDiscount = rvalue.TotalBeforeDiscount - rvalue.TotalDiscount;
    this.item.CalcTotalAfterTax = this.item.CalcTotalAfterDiscount + rvalue.Tax - rvalue.WithholdingTax;
    this.item.CalcBalance = this.item.CalcTotalAfterTax - rvalue.Received;

    this.formGroup.controls['CalcTotalAfterDiscount'].setValue(this.item.CalcTotalAfterDiscount);
    this.formGroup.controls['CalcTotalAfterTax'].setValue(this.item.CalcTotalAfterTax);
    this.formGroup.controls['CalcBalance'].setValue(this.item.CalcBalance);

    super.saveChange2();
  }

  IDReceiptDataSource = {
    searchProvider: this.receiptProvider,
    loading: false,
    input$: new Subject<string>(),
    selected: [],
    items$: null,
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
                SortBy: ['Id_desc'],
                Take: 20,
                Skip: 0,
                Term: term,
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

  receiptChange(e) {
    if (e.IDPurchaseOrder) {
      this.formGroup.controls['IDPurchaseOrder'].setValue(e.IDPurchaseOrder);
      this.formGroup.controls['IDPurchaseOrder'].markAsDirty();
    }

    if (e.IDVendor) {
      this.formGroup.controls['IDSeller'].setValue(e.IDVendor);
      this.formGroup.controls['IDSeller'].markAsDirty();
    }

    if (e.IDStorer) {
      this.formGroup.controls['IDBuyer'].setValue(e.IDStorer);
      this.formGroup.controls['IDBuyer'].markAsDirty();
    }

    if (e.StorerName) {
      this.formGroup.controls['BuyerName'].setValue(e.StorerName);
      this.formGroup.controls['BuyerName'].markAsDirty();
    }

    if (e.VendorName) {
      this.formGroup.controls['SellerName'].setValue(e.VendorName);
      this.formGroup.controls['SellerName'].markAsDirty();
    }

    this.saveChange();
  }

  IDPurchaseOrderDataSource = {
    searchProvider: this.purchaseOrderProvider,
    loading: false,
    input$: new Subject<string>(),
    selected: [],
    items$: null,
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
                SortBy: ['Id_desc'],
                Take: 20,
                Skip: 0,
                Term: term,
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
}
