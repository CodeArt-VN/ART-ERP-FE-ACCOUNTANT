import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BANK_OutgoingPaymentProvider, BRA_BranchProvider, SYS_ConfigProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { SortConfig } from 'src/app/models/options-interface';

@Component({
  selector: 'app-outgoing-payment',
  templateUrl: 'outgoing-payment.page.html',
  styleUrls: ['outgoing-payment.page.scss'],
})
export class OutgoingPaymentPage extends PageBase {
  statusList: [];
  constructor(
    public pageProvider: BANK_OutgoingPaymentProvider,
    public branchProvider: BRA_BranchProvider,
    public modalController: ModalController,
    public sysConfigProvider: SYS_ConfigProvider,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public navCtrl: NavController,
    public location: Location,
  ) {
    super();
  }

  preLoadData(event?: any): void {
    let sorted: SortConfig[] = [{ Dimension: 'Id', Order: 'DESC' }];
    this.pageConfig.sort = sorted;
    let sysConfigQuery = ['OutgoingPaymentUsedApprovalModule'];
    Promise.all([
      this.env.getStatus('OutgoingPaymentStatus'), 
      this.sysConfigProvider.read({Code_in: sysConfigQuery,IDBranch: this.env.selectedBranch,})
    ]).then((values: any) => {
      if (values.length) {
        this.statusList = values[0];
        if (values[1]['data']) {
          values[1]['data'].forEach((e) => {
            if ((e.Value == null || e.Value == 'null') && e._InheritedConfig) {
              e.Value = e._InheritedConfig.Value;
            }
            this.pageConfig[e.Code] = JSON.parse(e.Value);
          });
        }
        if (this.pageConfig.OutgoingPaymentUsedApprovalModule) {
          this.pageConfig.canApprove = false;
        }
      }
      super.preLoadData(event);
    });
  }
  changeSelection(i, e = null) {
    super.changeSelection(i, e);
    if (this.pageConfig.canApprove) {
      this.pageConfig.ShowApprove = true;
      this.pageConfig.ShowDisapprove = true;
    }
    if (this.pageConfig.canSubmit) {
      this.pageConfig.ShowSubmit = true;
    }
    if (this.pageConfig.canCancel) {
      this.pageConfig.ShowCancel = true;
    }
    this.selectedItems?.forEach((i) => {
      let notShowApprove = [ 'Approved','Cancelled','Draft'];
      if (notShowApprove.indexOf(i.Status) > -1 || i.DifferenceAmount != 0) {
        this.pageConfig.ShowApprove = false;
      }
      let notShowDisapprove = ['Unapproved', 'Approved','Cancelled','Draft'];
      if (notShowDisapprove.indexOf(i.Status) > -1 || i.DifferenceAmount != 0) {
        this.pageConfig.ShowDisapprove = false;
      }
      let notShowCancel = ['Approved','Cancelled'];
      if (notShowCancel.indexOf(i.Status) > -1 || i.DifferenceAmount != 0) {
        this.pageConfig.ShowCancel = false;
      }
      let notShowSubmit = ['Unapproved', 'Approved','Cancelled','Submitted'];
      if (notShowSubmit.indexOf(i.Status) > -1 || i.DifferenceAmount != 0) {
        this.pageConfig.ShowSubmit = false;
      }
    });
  }

  submit(){
    if(!this.pageConfig.canSubmit) return;
     let ids= this.selectedItems.map(i => i.Id);
     this.env.showLoading('Please wait for a few moments',
    this.pageProvider.commonService.connect('POST','BANK/OutgoingPayment/Submit',ids).toPromise()).then(rs=>{
      this.env.showMessage('Saved', 'success');
      this.refresh();
    }).catch(err=>{
      if(err.error?.Message){
        try{
          let messageObj = JSON.parse(err.error?.Message);
          if(messageObj && messageObj.Message1 && messageObj.Message2){
            this.env.showPrompt(
              { code:  messageObj.Message2+ '{{value}}', value:messageObj.DocumentEntry.toString()  },
              null,
              { code: messageObj.Message1+ '{{value}}', value: messageObj.payments.join() },
            )
          }
          else this.env.showMessage(err.error?.Message?? err, 'danger')
        
        }catch(e) { this.env.showMessage(err.error?.Message?? err, 'danger')} ;
       
      }
      else    this.env.showMessage(err, 'danger');
    });
  }
  approve(){
    if(!this.pageConfig.canApprove) return;
     let ids= this.selectedItems.map(i => i.Id);
     this.env.showLoading('Please wait for a few moments',
    this.pageProvider.commonService.connect('POST','BANK/OutgoingPayment/approve',ids).toPromise()).then(rs=>{
        this.env.showMessage('Saved', 'success');
        this.refresh();
      }).catch(err=>{
        if(err.error?.Message){
          try{
            let messageObj = JSON.parse(err.error?.Message);
            if(messageObj && messageObj.Message1 && messageObj.Message2){
              this.env.showPrompt(
                { code:  messageObj.Message2+ '{{value}}', value:messageObj.DocumentEntry.toString()  },
                null,
                { code: messageObj.Message1+ '{{value}}', value: messageObj.payments.join() },
              )
            }
            else this.env.showMessage(err.error?.Message?? err, 'danger')
          
          }catch(e) { this.env.showMessage(err.error?.Message?? err, 'danger')} ;
         
        }
        else    this.env.showMessage(err, 'danger');
      });
    }

  disapprove(){
    if(!this.pageConfig.canApprove) return;
     let ids= this.selectedItems.map(i => i.Id);
     this.env.showLoading('Please wait for a few moments',
    this.pageProvider.commonService.connect('POST','BANK/OutgoingPayment/disapprove',ids).toPromise()).then(rs=>{
      this.env.showMessage('Saved', 'success');
      this.refresh();
    }).catch(err=>{
      if(err.error?.Message){
        try{
          let messageObj = JSON.parse(err.error?.Message);
          if(messageObj && messageObj.Message1 && messageObj.Message2){
            this.env.showPrompt(
              { code:  messageObj.Message2+ '{{value}}', value:messageObj.DocumentEntry.toString()  },
              null,
              { code: messageObj.Message1+ '{{value}}', value: messageObj.payments.join() },
            )
          }
          else this.env.showMessage(err.error?.Message?? err, 'danger')
        
        }catch(e) { this.env.showMessage(err.error?.Message?? err, 'danger')} ;
       
      }
      else    this.env.showMessage(err, 'danger');
    });
  }
  cancel(){
    if(!this.pageConfig.canCancel) return;
     let ids= this.selectedItems.map(i => i.Id);
     this.env.showLoading('Please wait for a few moments',
    this.pageProvider.commonService.connect('POST','BANK/OutgoingPayment/Cancel',ids).toPromise()).then(rs=>{
      this.env.showMessage('Saved', 'success');
      this.refresh();
    }).catch(err=>{
      if(err.error?.Message){
        try{
          let messageObj = JSON.parse(err.error?.Message);
          if(messageObj && messageObj.Message1 && messageObj.Message2){
            this.env.showPrompt(
              { code:  messageObj.Message2+ '{{value}}', value:messageObj.DocumentEntry.toString()  },
              null,
              { code: messageObj.Message1+ '{{value}}', value: messageObj.payments.join() },
            )
          }
          else this.env.showMessage(err.error?.Message?? err, 'danger')
        
        }catch(e) { this.env.showMessage(err.error?.Message?? err, 'danger')} ;
       
      }
      else    this.env.showMessage(err, 'danger');
    });
  }
}
