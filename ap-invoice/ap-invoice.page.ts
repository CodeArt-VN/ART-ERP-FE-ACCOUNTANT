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
})
export class APInvoicePage extends PageBase {
  statusList = [];
  paymentStatusList = [];
  paymentTypeList = [];
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
    });
  }

  preLoadData(event?: any): void {
    this.query.SortBy = 'Id_desc';
    Promise.all([this.env.getStatus('APInvoice'),this.env.getStatus('OutgoingPaymentStatus'), this.env.getType('PaymentType')]).then((values) => {
      if(values[0]){
        this.statusList = values[0];
      }
      if(values[1]){
        this.paymentStatusList = values[1];
        console.log(this.paymentStatusList);
        
      }
      if(values[2]){
        this.paymentTypeList = values[2].filter((d) => d.Code == 'Cash' || d.Code == 'Card' || d.Code == 'Transfer');
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
    if (!this.isOpenPopover || !this.IDBusinessPartner) return;
    if (apply) {
      this.submitAttempt = true;
      let obj = {
        Id:0,
        IDBusinessPartner : this.IDBusinessPartner,
        Status:'Draft',
        Amount : 0,
        PostingDate: new Date(),
        DueDate: new Date(),
        DocumentDate: new Date(),
        Type:this.formGroup.get('PaymentType').value,
        OutgoingPaymentDetails : this.selectedItems.map(d=> {
          return {
            DocumentEntry : d.Id,
            DocumentType : "Invoice",
            Amount: d.CalcBalance,
          }
      }),
    } 
    obj.Amount = obj.OutgoingPaymentDetails.reduce((sum, detail) => sum + (detail.Amount || 0), 0);
    this.outgoingPaymentProvider.save(obj).then(rs=>{
      this.env.showMessage('Create outgoing payment successfully!','success');
      console.log(rs);
    }).catch(err=>{
      this.env.showMessage(err?.Message?? err,'danger');

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
      let notShowRequestOutgoingPayment = ['Draft', 'Closed', 'Cancelled'];
      if (notShowRequestOutgoingPayment.indexOf(i.Status) != -1 ) {
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
