import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, ModalController, LoadingController, AlertController, PopoverController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
  BANK_OutgoingPaymentProvider,
  BRA_BranchProvider,
  CRM_ContactProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, FormControl, FormArray, Validators } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { Subject, catchError, concat, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { OutgoingPaymentPurchaseOrderModalPage } from '../outgoing-payment-purchase-order-modal/outgoing-payment-purchase-order-modal.page';
import { OutgoingPaymentInvoiceModalPage } from '../outgoing-payment-invoice-modal/outgoing-payment-invoice-modal.page';

@Component({
  selector: 'app-outgoing-payment-detail',
  templateUrl: './outgoing-payment-detail.page.html',
  styleUrls: ['./outgoing-payment-detail.page.scss'],
})
export class OutgoingPaymentDetailPage extends PageBase {
  statusList: [];
  SelectedOrderList: any;
  SelectedInvoiceList: any;
  defaultBusinessPartner : any;
  differenceAmount = 0 ;
  orderPaymentCount = 0 ;
  invoicePaymentCount = 0 ;
  constructor(
    public pageProvider: BANK_OutgoingPaymentProvider,
    // public OutgoingPaymentDetailservice: BANK_OutgoingPaymentDetailProvider,
    public branchProvider: BRA_BranchProvider,
    public popoverCtrl: PopoverController,
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

    this.formGroup = formBuilder.group({
      IDBranch: [this.env.selectedBranch],
      Id: new FormControl({ value: '', disabled: true }),
      IDTransaction: new FormControl({ value: '', disabled: true }),
      Name: [''],
      Code: [''],
      DocumentDate: ['', Validators.required],
      PostingDate: ['', Validators.required],
      DueDate: ['', Validators.required],
      Type: ['', Validators.required],
      SubType: [''],
      Remark: [''],
      Amount: ['', Validators.required],
      Status: [''],
      IDBusinessPartner: ['', Validators.required],
      OutgoingPaymentDetails: this.formBuilder.array([]),
      IsDisabled: new FormControl({ value: '', disabled: true }),
      IsDeleted: new FormControl({ value: '', disabled: true }),
      CreatedBy: new FormControl({ value: '', disabled: true }),
      CreatedDate: new FormControl({ value: '', disabled: true }),
      ModifiedBy: new FormControl({ value: '', disabled: true }),
      ModifiedDate: new FormControl({ value: '', disabled: true }),
      DeletedFields: [[]],
    });
  }

  segmentView = 's1';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
  }

  async saveChange() {
    super.saveChange2();
  }


  typeDataSource: any;
  preLoadData(event?: any): void {
    Promise.all([this.env.getStatus('OutgoingPaymentStatus'), this.env.getType('PaymentType')]).then((values: any) => {
      if (values.length) {
        this.statusList = values[0]//.filter((d) => d.Code != 'PaymentStatus');
        this.typeDataSource = values[1].filter((d) => d.Code == 'Cash' || d.Code == 'Card' || d.Code == 'Transfer');
      }
      super.preLoadData(event);
    });
  }

  
  amountOrder = 0;
  amountInvoice = 0;
  loadedData(event?: any, ignoredFromGroup?: boolean): void {
    if (this.item?.Status != 'Draft') {
      if (this.item.IDBusinessPartner == null && this.pageConfig.canEdit) {
      }
      this.pageConfig.canEdit = false;
    }

    super.loadedData(event, ignoredFromGroup);
    if(this.item?.Status) this.item._Status =  this.statusList.find((d:any) => d.Code == this.item?.Status);
    this.amountOrder = 0;
    this.amountInvoice = 0;
    const formArray = this.formGroup.get('OutgoingPaymentDetails') as FormArray;
    formArray.clear();
    formArray.valueChanges.subscribe(value => {
      this.invoicePaymentCount = formArray.value.filter(d=> d.DocumentType=='Invoice').length;
      this.orderPaymentCount = formArray.value.filter(d=> d.DocumentType=='Order').length;
      this.calcDifferenceAmount();
    });
    this.formGroup.get('Amount').valueChanges.subscribe(value => {
      this.calcDifferenceAmount();
    });
    this.item.OutgoingPaymentDetails?.forEach((i) => {
      this.addField(i);
    });
    if (this.item?.Id && this.item?.IDBusinessPartner) {
      this._contactDataSource.selected = [];
      this._contactDataSource.selected.push(this.item._BusinessPartner);
      this.defaultBusinessPartner = this.item._BusinessPartner;
    }
    this._contactDataSource.initSearch();
  }

  addField(field: any, markAsDirty = false) {
    let groups = <FormArray>this.formGroup.controls.OutgoingPaymentDetails;
    let group = this.formBuilder.group({
      IDOutgoingPayment: [this.item.Id],
      Id: new FormControl({ value: field.Id, disabled: false }),
      Name: [field.Name],
      DocumentType: new FormControl({ value: field.DocumentType, disabled: false }),
      DocumentEntry: [field.DocumentEntry],
      IDBusinessPartner: new FormControl({ value: field.IDBusinessPartner, disabled: false }),
      Remark: new FormControl({ value: field.Remark, disabled: false }),
      ForeignRemark: new FormControl({ value: field.ForeignRemark, disabled: false }),
      Amount: new FormControl({ value: field.Amount, disabled: false }),
    });
    groups.push(group);
    if (markAsDirty) {
      group.get('IDOutgoingPayment').markAsDirty();
      group.get('Id').markAsDirty();
      group.get('DocumentEntry').markAsDirty();
      group.get('DocumentType').markAsDirty();
      group.get('IDBusinessPartner').markAsDirty();
      group.get('Remark').markAsDirty();
      group.get('Amount').markAsDirty();
      this.formGroup.get('OutgoingPaymentDetails').markAsDirty();
    }
  }

  changeType(e) {
    this.formGroup.get('Type').setValue(e.Code);
    this.formGroup.get('Type').markAsDirty();
    this.saveChange();
  }

  outgoingPaymentDetails: any;
  async showOrderModal() {
    this.outgoingPaymentDetails = [...this.formGroup.controls.OutgoingPaymentDetails.value.filter(d=> d.DocumentType=='Order')];
    this.outgoingPaymentDetails?.forEach(s=> s.IDOrder = s.DocumentEntry);
    this.SelectedOrderList = [...this.outgoingPaymentDetails]
    let amountOrder = this.formGroup.get('Amount').value - this.amountInvoice;
   //  let amountOrder = this.formGroup.get('Amount').value - this.amountInvoice; 
    const modal = await this.modalController.create({
      component: OutgoingPaymentPurchaseOrderModalPage,
      componentProps: {
        IDBusinessPartner: this.formGroup.controls.IDBusinessPartner.value,
        DefaultBusinessPartner : this.defaultBusinessPartner,
        canEdit: this.pageConfig.canEdit,
        amount: amountOrder,
        IDOutgoingPayment: this.formGroup.controls.Id.value,
        SelectedOrderList: this.SelectedOrderList,
        canEditAmount: true,
      },
      cssClass: 'modal90',
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();
    this.SelectedOrderList = [];
    if (data && data.length) {
      let deletedFields = [];
      let dataIds = [];
      for (let i = 0; i < data.length; i++) {
        const e = data[i];
        e.DocumentEntry = e.IDOrder;
        e.DocumentType = 'Order';
        this.SelectedOrderList.push(e);
        if (!this.outgoingPaymentDetails.some((item) =>item.DocumentType == 'Order' && item.DocumentEntry == e.DocumentEntry)) {
          this.addField(e, true);
        } else {
          if(e.Amount != this.outgoingPaymentDetails.find((item) =>item.DocumentType == 'Order' && item.DocumentEntry == e.DocumentEntry).Amount)
          {
            this.updateField(e);
          }
        }
        dataIds = data.map((e) => e.IDOrder);
      }
      this.outgoingPaymentDetails.forEach((x) => {
        if (!dataIds.includes(x.DocumentEntry) && x.DocumentType == 'Order') {
          if (x.Id) {
            deletedFields.push(x.Id);
          } else {
            let groups = <FormArray>this.formGroup.controls.OutgoingPaymentDetails;
            let index = groups.controls.findIndex((d) => d.value.DocumentEntry == x.DocumentEntry);
            groups.removeAt(index);
          }
        }
      });
      if (deletedFields.length && this.formGroup.controls.Id.value) {
        deletedFields.forEach((deletedId) => {
          let groups = <FormArray>this.formGroup.controls.OutgoingPaymentDetails;
          let index = groups.controls.findIndex((d) => d.value.Id == deletedId);
          groups.removeAt(index);
        });
        this.removeField(deletedFields);
      }
      this.amountOrder = data.Amount;
      this.formGroup.get('Amount').setValue(data.Amount + this.amountInvoice);
      this.formGroup.get('Amount').markAsDirty();
      this.orderPaymentCount = data.length;

      if (this.formGroup.valid) {
        this.saveChange();
      }
    }
  }
  async showInvoiceModal() {
    this.outgoingPaymentDetails = [...this.formGroup.controls.OutgoingPaymentDetails.value];
    this.outgoingPaymentDetails?.value?.forEach(s=> s.IDOrder = s.DocumentEntry);
    this.SelectedInvoiceList = this.outgoingPaymentDetails?.filter(d=> d.DocumentType=='Invoice');
    this.SelectedOrderList = this.outgoingPaymentDetails?.filter(d=> d.DocumentType=='Order');
   // let amountInvoice = this.formGroup.get('Amount').value - parseFloat(this.SelectedOrderList.reduce((sum, item) => sum + (item.Amount || 0), 0)) 
   let amountInvoice = this.formGroup.get('Amount').value - this.amountOrder;
    const modal = await this.modalController.create({
      component: OutgoingPaymentInvoiceModalPage,
      componentProps: {
        IDBusinessPartner: this.formGroup.controls.IDBusinessPartner.value,
        canEdit: this.pageConfig.canEdit,
        DefaultBusinessPartner : this.defaultBusinessPartner,
        IDOutgoingPayment: this.formGroup.controls.Id.value,
        amount: amountInvoice,
        canEditAmount: true,
        SelectedInvoiceList: this.SelectedInvoiceList,
      },
      cssClass: 'modal90',
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();
    this.SelectedInvoiceList = [];
    if (data && data.length) {
      let deletedFields = [];
      let dataIds = [];
      for (let i = 0; i < data.length; i++) {
        const e = data[i];
        e.DocumentEntry = e.IDInvoice;
        e.DocumentType = 'Invoice';
        e.IDBusinessPartner = e.IDSeller;
        this.SelectedInvoiceList.push(e);
        e.IDOrder = null;
        if (!this.outgoingPaymentDetails.some((item) => item.DocumentType == 'Invoice' && item.DocumentEntry === e.IDInvoice)) {
          this.addField(e, true);
        } else {
          if(e.Amount != this.outgoingPaymentDetails.find((item) =>item.DocumentType == 'Invoice' && item.DocumentEntry == e.DocumentEntry).Amount)
          {
            this.updateField(e);
          }
        }
        dataIds = data.map((e) => e.IDInvoice);
      }
      this.outgoingPaymentDetails.forEach((x) => {
        if (!dataIds.includes(x.DocumentEntry) && x.DocumentType == 'Invoice') {
          if (x.Id) {
            deletedFields.push(x.Id);
          } else {
            let groups = <FormArray>this.formGroup.controls.OutgoingPaymentDetails;
            let index = groups.controls.findIndex((d) => d.value.DocumentEntry == x.DocumentEntry);
            groups.removeAt(index);
          }
        }
      });
      if (deletedFields.length && this.formGroup.controls.Id.value) {
        deletedFields.forEach((deletedId) => {
          let groups = <FormArray>this.formGroup.controls.OutgoingPaymentDetails;
          let index = groups.controls.findIndex((d) => d.value.Id == deletedId);
          groups.removeAt(index);
        });
        this.removeField(deletedFields);
      }
      this.amountInvoice = data.Amount;
      this.formGroup.get('Amount').setValue(data.Amount + this.amountOrder);
      this.formGroup.get('Amount').markAsDirty();
      this.invoicePaymentCount = data.length;
      if (this.formGroup.valid) {
        this.saveChange();

      }
    }
  }

  changeDate(e){
    if(!this.formGroup.get('DocumentDate').value){
      this.formGroup.get('DocumentDate').setValue(e.target.value);
      this.formGroup.get('DocumentDate').markAsDirty();
    }
    if(!this.formGroup.get('PostingDate').value){
      this.formGroup.get('PostingDate').setValue(e.target.value);
      this.formGroup.get('PostingDate').markAsDirty();
    }
    if(!this.formGroup.get('DueDate').value){
      this.formGroup.get('DueDate').setValue(e.target.value);
      this.formGroup.get('DueDate').markAsDirty();
    }
    this.saveChange();
  }
  changeAmount(){
    if( this.submitAttempt) return;
     this.submitAttempt = true;
    let paymentDetails = <FormArray> this.formGroup.controls.OutgoingPaymentDetails;
    if(paymentDetails.controls.length>0){
      this.env
      .showPrompt('Khi thay đổi lượng tiền bạn cần điều chỉnh lại các đơn hàng/hóa đơn!', 'Warning', 'Bạn có muốn xóa toàn bộ hóa đơn trước đó không?','Delete','No')
      .then((_) => {
        this.formGroup.get('DeletedFields').setValue(this.formGroup.controls.OutgoingPaymentDetails['controls'].map(s=>s.get('Id').value));
        this.formGroup.get('DeletedFields').markAsDirty();
        this.submitAttempt = false;
        let groups = <FormArray>this.formGroup.controls.OutgoingPaymentDetails;
        groups.clear();
        this.saveChange();
      })
      .catch((_) => {
        // this.formGroup.get('Amount').setValue(this.trackingAmount);
        // this.formGroup.get('Amount').markAsPristine();
        this.submitAttempt = false;
        this.saveChange();

      });
    }
    else{
      this.submitAttempt = false;
      // this.trackingAmount = this.formGroup.get('Amount').value;
      this.saveChange();
    }

    };
  
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

  async updateField(updatedField: any) {
    const index = this.outgoingPaymentDetails.findIndex(
      (d) => d.Id === updatedField.IDPaymentDetail 
    );
    if (index != -1) {
      this.outgoingPaymentDetails[index].Amount = updatedField.Amount;
      const group = <FormArray>this.formGroup.controls.OutgoingPaymentDetails;
      group.at(index).get('Amount').setValue(updatedField.Amount);
      group.at(index).get('IDOutgoingPayment').markAsDirty();
      group.at(index).get('Amount').markAsDirty();
    }
  }

  removeItem(index) {
    let groups = <FormArray>this.formGroup.controls.OutgoingPaymentDetails;
    let id = groups.controls[index].value.Id;
    if (id != 0) {
      this.env.showPrompt('Bạn có chắc muốn xóa không?', null, 'Xóa 1 dòng').then((_) => {
        this.formGroup.get('DeletedFields').setValue([id]);
        this.formGroup.get('DeletedFields').markAsDirty();
        this.saveChange();
        groups.removeAt(index);
      });
    } else {
      groups.removeAt(index);
    }
  }

  IDCustomerChange() {
    if (this.item.Id != 0) {
      this.env
        .showPrompt('Khi thay đổi khách hàng sẽ xóa toàn bộ hóa đơn trước đó', null, 'Bạn có muốn thay đổi không?')
        .then((_) => {
          this.formGroup.get('DeletedFields').setValue(this.formGroup.controls.OutgoingPaymentDetails['controls'].map(s=>s.get('Id').value));
          this.formGroup.get('DeletedFields').markAsDirty();
          this.saveChange();
          this.formGroup.controls.OutgoingPaymentDetails = new FormArray([]);
        })
        .catch((_) => {
          this.formGroup.controls.IDBusinessPartner.setValue(this.item.IDBusinessPartner);
          this._contactDataSource.initSearch();
        });
    } else {
      this.formGroup.controls.OutgoingPaymentDetails = new FormArray([]);
    }
  }
  calcDifferenceAmount(){
    this.amountOrder =  parseFloat( this.formGroup.get('OutgoingPaymentDetails').value.filter(d=>d.DocumentType =='Order').reduce((sum, item) => sum + (item.Amount || 0), 0));
    this.amountInvoice = parseFloat( this.formGroup.get('OutgoingPaymentDetails').value.filter(d=>d.DocumentType =='Invoice').reduce((sum, item) => sum + (item.Amount || 0), 0)) ;
    this.orderPaymentCount =this.formGroup.get('OutgoingPaymentDetails').value.filter(d=>d.DocumentType =='Order') ;
    this.invoicePaymentCount = this.formGroup.get('OutgoingPaymentDetails').value.filter(d=>d.DocumentType =='Invoice');
    this.differenceAmount = this.formGroup.get('Amount').value - (this.amountOrder + this.amountInvoice);
  }
}
