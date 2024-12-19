import { Component, ViewChild } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { AC_APInvoiceProvider, BANK_OutgoingPaymentProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { FormBuilder } from '@angular/forms';

@Component({
    selector: 'app-ap-invoice',
    templateUrl: 'ap-invoice.page.html',
    styleUrls: ['ap-invoice.page.scss'],
    standalone: false
})
export class APInvoicePage extends PageBase {
  statusList = [];
  paymentStatusList = [];
  paymentTypeList = [];
  paymentReasonList = [];
  paymentSubTypeList = [];

    constructor(
    public pageProvider: AC_APInvoiceProvider,
    public outgoingPaymentProvider: BANK_OutgoingPaymentProvider,
    public modalController: ModalController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public formBuilder: FormBuilder,
    public navCtrl: NavController,
    public location: Location,
  ) {
    super();
     
    this.formGroup = formBuilder.group({
      PaymentType: [''],
      PaymentSubType:[''],
      PaymentReason : ['']      
    });
  }

  preLoadData(event?: any): void {
    this.query.SortBy = 'Id_desc';
    Promise.all([this.env.getStatus('APInvoice'),
        this.env.getStatus('OutgoingPaymentStatus'),
       this.env.getType('PaymentType'),
       this.env.getType('OutgoingPaymentReasonType')
      ]).then((values) => {
      if(values[0]){
        this.statusList = values[0];
      }
      if(values[1]){
        this.paymentStatusList = values[1];
      }
      if(values[2]){
        this.paymentTypeList = values[2].filter((d) => d.Code == 'Cash' || d.Code == 'Card' || d.Code == 'Transfer');
      }
      if(values[3]){
        this.paymentReasonList = values[3];
        if(values[3].length==0) this.paymentReasonList = [{Name : 'Payment of invoice', Code :'PaymentOfInvoice'},{Name : 'Payment of purchase order', Code :'PaymentOfPO'}]
      }
      super.preLoadData();
    });
  }

  ngOnDestroy() {
    this.dismissPopover();
  }

  @ViewChild('popoverPub') popoverPub;
  isOpenPopover = false;
  dismissPopover(apply: boolean = false) {
    if (!this.isOpenPopover || !this.IDBusinessPartner){
      this.isOpenPopover = false;
      return;
    } 
    if (apply) {
      this.submitAttempt = true;
      let obj = {
        Id:0,
        IDBusinessPartner : this.IDBusinessPartner,
        IDBranch:this.env.selectedBranch,
        SourceType : 'Invoice',
        IDStaff : this.env.user.StaffID,
        Name: 'Pay for A/P invoice ['+this.selectedItems.map(d=> d.Id).join(',')+']',
        Type:this.formGroup.get('PaymentType').value,
        SubType:this.formGroup.get('PaymentSubType').value,
        PaymentReason:this.formGroup.get('PaymentReason').value,
        PostingDate: new Date(),
        DueDate: new Date(),
        DocumentDate: new Date(),
        OutgoingPaymentDetails : this.selectedItems.map(d=> d.Id)
      };
    this.outgoingPaymentProvider.commonService.connect('POST','BANK/OutgoingPayment/PostFromSource',obj).toPromise().then((rs:any)=>{
      this.env.showPrompt('Create outgoing payment successfully!','Do you want to navigate to outgoing payment ?').then(d=> {
        this.nav('Outgoing-Payment/'+rs.Id, 'forward');
      })
      console.log(rs);
    }).catch(err=>{
      this.env.showMessage(err.error?.Message?? err,'danger');

    }).finally(()=> {this.submitAttempt = false});
     
      // this.form.patchValue(this._reportConfig?.DataConfig);
    }
    this.isOpenPopover = false;
  }
  presentPopover(event) {
    this.isOpenPopover = true;
  }
  IDBusinessPartner;
  ShowRequestOutgoingPayment;
  changeSelection(i, e = null) {
    super.changeSelection(i, e);
    this.ShowRequestOutgoingPayment = false;
    if (this.pageConfig.canRequestOutgoingPayment) {
      this.ShowRequestOutgoingPayment = true;
    }
    const uniqueSellerIDs = new Set(this.selectedItems.map(i => i.IDSeller));
    this.selectedItems?.forEach((i) => {
      let notShowRequestOutgoingPaymentAPStatus = ['Draft', 'Closed', 'Cancelled'];
      let notShowRequestOutgoingPaymentPaymentStatus = ['Unapproved','Paid'];
      if (notShowRequestOutgoingPaymentAPStatus.indexOf(i.Status) != -1 ||
      notShowRequestOutgoingPaymentPaymentStatus.indexOf(i.PaymentStatus) != -1) {
        this.ShowRequestOutgoingPayment = false;
        this.IDBusinessPartner = null;
      }
      if (uniqueSellerIDs.size > 1) {
        this.ShowRequestOutgoingPayment = false;
        this.IDBusinessPartner = null;

      }
      else{
        this.IDBusinessPartner = [...uniqueSellerIDs][0];
      }
    });
    if(this.selectedItems?.length == 0 ){
      this.ShowRequestOutgoingPayment = false;
    }
  }
}
