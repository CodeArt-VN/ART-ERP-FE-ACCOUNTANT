import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, ModalController, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { SALE_OrderProvider, BRA_BranchProvider, HRM_StaffProvider, CRM_ContactProvider, SALE_OrderDetailProvider, AC_ARInvoiceProvider, AC_ARInvoiceDetailProvider, AC_ARInvoiceSODetailProvider, WMS_ItemProvider, SYS_StatusProvider, SYS_TypeProvider, AC_APInvoiceProvider, PURCHASE_OrderProvider } from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { NgSelectConfig } from '@ng-select/ng-select';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, skip, switchMap, tap } from 'rxjs/operators';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { lib } from 'src/app/services/static/global-functions';

import { EInvoiceService } from 'src/app/services/einvoice.service';

@Component({
  selector: 'app-ap-invoice-detail',
  templateUrl: './ap-invoice-detail.page.html',
  styleUrls: ['./ap-invoice-detail.page.scss'],
})
export class APInvoiceDetailPage extends PageBase {
  statusList = [];
  statusEInvoiceList = [];
  typeList = [];
  paymentMethodList = [];
  receiveTypeList = [];
  invoiceFormList = [];
  invoiceSerialList = [];
  typeCreateInvoiceList = [];

  initContactsIds = [];
  branch = null;

  constructor(
    public pageProvider: AC_APInvoiceProvider,
    public arInvoiceDetailProvider: AC_ARInvoiceDetailProvider,
    public arInvoiceSODetailProvider: AC_ARInvoiceSODetailProvider,
    public orderProvider: SALE_OrderProvider,
    public orderDetailProvider: SALE_OrderDetailProvider,
    public purchaseOrderProvider : PURCHASE_OrderProvider,
    public branchProvider: BRA_BranchProvider,
    public contactProvider: CRM_ContactProvider,
    public itemProvider: WMS_ItemProvider,
    public statusProvider: SYS_StatusProvider,
    public typeProvider: SYS_TypeProvider,
    public paymentMethodProvider: SYS_TypeProvider,
    public receiveTypeProvider: SYS_TypeProvider,
    public invoiceFormProvider: SYS_TypeProvider,
    public invoiceSerialProvider: SYS_TypeProvider,
    public typeCreateInvoiceProvider: SYS_TypeProvider,
    public staffPovider: HRM_StaffProvider,

    public EInvoiceService: EInvoiceService,

    public env: EnvService,
    public navCtrl: NavController,
    public route: ActivatedRoute,
    public modalController: ModalController,
    public alertCtrl: AlertController,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
    public commonService: CommonService,
    private config: NgSelectConfig
  ) {
    super();
    this.item = {};
    this.pageConfig.isDetailPage = true;
    this.id = this.route.snapshot.paramMap.get('id');
    this.formGroup = formBuilder.group({
      //AP Invoice

      IDBranch: new FormControl({ value: '', disabled: false }),
      IDBusinessPartner: [''],
      IDOrder: new FormControl({ value: '', disabled: false }),
      IDParent: [''],
      Id: new FormControl({ value: '', disabled: true }),
      Code: [''],
      Name: [''],
      Remark: [''],

      Status: new FormControl({ value: '', disabled: true }),
      Type: new FormControl({ value: '', disabled: false }),
      InvoiceDate: new FormControl({ value: '', disabled: true }),

      SellerName: ['', Validators.required],
      SellerTaxCode: [''],
      SellerUnitName: [''],
      SellerAddress: [''],
      SellerBankAccount: new FormControl({ value: '', disabled: false }),
      SellerPhone: [''],
      SellerEmail: ['', Validators.email],

      InvoiceGUID: [''],
      InvoiceForm: new FormControl({ value: '', disabled: false }),
      InvoiceSerial: new FormControl({ value: '', disabled: false }),
      InvoiceNo: new FormControl({ value: '', disabled: false }),
      InvoiceCode: new FormControl({ value: '', disabled: false }),
      SignedDate: new FormControl({ value: '', disabled: true }),
      RefCode: [''],
      Currency: [''],
      ExchangeRate: [''],

      PaymentMethod: new FormControl({ value: 'InCash/WireTransfer', disabled: false }),

      OriginalInvoiceIdentify: new FormControl({ value: '', disabled: true }), // xóa
      IsCanceled: [''],
      TotalBeforeDiscount: [''],
      TotalDiscount: [''],
      TotalAfterDiscount: [''],
      Tax: [''],
      TotalAfterTax: [''],

      Sort: [''],
      IsDisabled: [''],
      IsDeleted: [''],
      CreatedBy: [''],
      ModifiedBy: [''],
      CreatedDate: [''],
      ModifiedDate: ['']

    });

    //https://github.com/ng-select/ng-select
    this.config.notFoundText = 'Không tìm thấy dữ liệu phù hợp...';
    this.config.clearAllText = 'Xóa hết';
  }

  segmentView = 's2';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
  }

  preLoadData(event) {
    Promise.all([
      this.env.getType('PaymentMethod'),
      this.env.getType('TypeCreateInvoice'),
      this.env.getType('InvoiceType'), //Invoice Type?
    ]).then((values: any) => {

      this.paymentMethodList = values[0];
      this.typeCreateInvoiceList = values[1];
      this.typeList = values[2];

      super.preLoadData(event);
    });
  }

  loadedData(event) {
    if (this.item.Id) {

      this.item.InvoiceDateText = lib.dateFormat(this.item.InvoiceDate, 'hh:MM dd/mm/yyyy');
      this.item.CreatedDateText = lib.dateFormat(this.item.CreatedDate, 'hh:MM dd/mm/yyyy');
      this.item.TotalAfterTaxText = lib.currencyFormat(this.item.TotalAfterTax);
      this.item.EInvoiceTotalText = lib.currencyFormat(this.item.TotalAfterTax);
      this.initContactsIds.push(this.item.IDBusinessPartner);
      this.item.Currency = "VND";

      if (this.pageConfig.canEditInvoiceDate) {
        this.formGroup.get('InvoiceDate').enable();
        this.formGroup.get('OriginalInvoiceIdentify').enable();
        this.formGroup.get('SignedDate').enable();
      }
      else {
        this.formGroup.get('InvoiceDate').disable();
        this.formGroup.get('OriginalInvoiceIdentify').disable();
        this.formGroup.get('SignedDate').disable();
      }
      this.itemSearch();
    }
    else {
      if (!this.pageConfig.canEdit) {
        this.pageConfig.canEdit = this.pageConfig.canAdd;
      }
    }

    if (this.initContactsIds.length) {
      this.contactProvider.read({ Id: JSON.stringify(this.initContactsIds) }).then((contacts: any) => {
        this.contactSelected = contacts.data[0];
        this.item.IDBusinessPartner = this.contactSelected.Id;
        contacts.data.forEach(contact => {
          if (contact && this.contactListSelected.findIndex(d => d.Id == contact.Id) == -1) {
            this.contactListSelected.push({ Id: contact.Id, Code: contact.Code, Name: contact.Name, WorkPhone: contact.WorkPhone, AddressLine1: contact.AddressLine1 });
          }
        });
      }).finally(() => {
        this.contactSearch();
        this.cdr.detectChanges();
      });
    }
    else {
      this.contactSearch();
      this.cdr.detectChanges();
    }

    if (this.item.IDOrder) {
      this.purchaseOrderProvider.read({ Id: this.item.IDOrder }).then((orders: any) => {
        this.orderSelected = orders.data[0];
        this.item.IDOrder = this.orderSelected.Id;
        orders.data.forEach(order => {
          if (order && this.orderListSelected.findIndex(d => d.Id == order.Id) == -1) {
            this.orderListSelected.push({ Id: order.Id, Code: order.Code, Name: order.Name});
          }
        });
      }).finally(() => {
        this.orderSearch();
        this.cdr.detectChanges();
      });
    }
    else {
      this.orderSearch();
      this.cdr.detectChanges();
    }

    if (this.item.IDBranch) {
      this.branchProvider.getAnItem(this.item.IDBranch).then((branch: any) => {
        this.branch = branch;
      })
    }
    super.loadedData(event);
  }
  
  itemList$
  itemListLoading = false;
  itemListInput$ = new Subject<string>();
  itemListSelected = [];

  itemSearch() {
    this.itemListLoading = false;
    this.itemList$ = concat(
      of(this.itemListSelected),
      this.itemListInput$.pipe(
        distinctUntilChanged(),
        tap(() => this.itemListLoading = true),
        switchMap(term => this.itemProvider.search({ Take: 20, Skip: 0, Term: term }).pipe(
          catchError(() => of([])), // empty list on error
          tap(() => this.itemListLoading = false)
        ))

      )
    );
  }

  contactList$
  contactListLoading = false;
  contactListInput$ = new Subject<string>();
  contactListSelected = [];
  contactSelected = null;
  contactSearch() {
    this.contactListLoading = false;
    this.contactList$ = concat(
      of(this.contactListSelected),
      this.contactListInput$.pipe(
        distinctUntilChanged(),
        tap(() => this.contactListLoading = true),
        switchMap(term => this.contactProvider.search({ Take: 20, Skip: 0, Term: term ? term : this.item.IDContact }).pipe(
          catchError(() => of([])), // empty list on error
          tap(() => this.contactListLoading = false)
        ))

      )
    );
  }

  async changedIDContact(i) {
    if (i) {
      this.contactSelected = i;
      this.item.IDBusinessPartner = i.Id;
      this.formGroup.controls.IDBusinessPartner.setValue(i.Id);
      this.formGroup.controls.IDBusinessPartner.markAsDirty();
      if (this.contactListSelected.findIndex(d => d.Id == i.Id) == -1) {
        this.contactListSelected.push(i);
        this.contactSearch();

        if (this.item.TypeCreateInvoice != 'TypeCreateInvoice1') {
          this.item.SellerName = this.contactSelected.Name;
          if (this.contactSelected.CompanyName != null) this.item.SellerUnitName = this.contactSelected.CompanyName;
          this.item.SellerTaxCode = this.contactSelected.WorkPhone;
          if (this.contactSelected.Address.AddressLine1 != null) this.item.SellerAddress = i.Address.AddressLine1;
          this.item.IDBusinessPartner = i.Id;
          this.item.ReceiverName = this.contactSelected.Name;
          this.item.ReceiverMobile = this.contactSelected.WorkPhone;
          this.item.ReceiverEmail = this.contactSelected.Email;
          this.item.Currency = "VND";


          this.formGroup.get('SellerName').enable();
          this.formGroup.get('SellerUnitName').enable();
          this.formGroup.get('SellerAddress').enable();
          this.formGroup.get('SellerTaxCode').enable();
          this.formGroup.get('SellerBankAccount').enable();

          this.formGroup.patchValue(this.item);
        }
        else {
          this.formGroup.get('SellerName').disable();
          this.formGroup.get('SellerUnitName').disable();
          this.formGroup.get('SellerAddress').disable();
          this.formGroup.get('SellerTaxCode').disable();
          this.formGroup.get('SellerBankAccount').disable();
        }
      }
      this.saveChange();
    }

  }

  orderList$
  orderListLoading = false;
  orderListInput$ = new Subject<string>();
  orderListSelected = [];
  orderSelected = null;
  orderSearch() {
    this.orderListLoading = false;
    this.orderList$ = concat(
      of(this.orderListSelected),
      this.orderListInput$.pipe(
        distinctUntilChanged(),
        tap(() => this.orderListLoading = true),
        switchMap(term => this.purchaseOrderProvider.search({ Take: 20, Skip: 0, Term: term ? term : this.item.IDOrder }).pipe(
          catchError(() => of([])), // empty list on error
          tap(() => this.orderListLoading = false)
        ))

      )
    );
  }

  changedIDOrder(i) {
    if (i) {
      this.orderSelected = i;
      this.item.IDOrder = i.Id;
      this.formGroup.controls.IDOrder.setValue(i.Id);
      this.formGroup.controls.IDOrder.markAsDirty();
      if (this.orderListSelected.findIndex(d => d.Id == i.Id) == -1) {
        this.orderListSelected.push(i);
        this.orderSearch();

      }
      this.saveChange();
    }
  }

  savedChange(savedItem = null, form = this.formGroup) {
    super.savedChange(savedItem, form);
    this.item = savedItem;
    this.loadedData(null);
  }

  saveChange() {
    if (this.submitAttempt) {
      return;
    }

    if (this.pageConfig.canEdit) {
      return super.saveChange();
    }
    else {
      return null;
    }
  }


}
