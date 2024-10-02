import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { PURCHASE_OrderProvider, SALE_OrderProvider } from 'src/app/services/static/services.service';
import { FormBuilder } from '@angular/forms';
import { lib } from 'src/app/services/static/global-functions';
import { CommonService } from 'src/app/services/core/common.service';

@Component({
  selector: 'app-outgoing-payment-purchase-order-modal',
  templateUrl: './outgoing-payment-purchase-order-modal.page.html',
  styleUrls: ['./outgoing-payment-purchase-order-modal.page.scss'],
})
export class OutgoingPaymentPurchaseOrderModalPage extends PageBase {
  IDBusinessPartner; 
  amount;
  SelectedOrderList: any;
  canEditAmount;
  canEdit;
  amountInvoice;
  isLockAmount = true;
  constructor(
    public pageProvider: PURCHASE_OrderProvider,
    public commonService: CommonService,
    public env: EnvService,
    public navCtrl: NavController,
    public route: ActivatedRoute,
    public modalController: ModalController,
    public alertCtrl: AlertController,
    public navParams: NavParams,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
  ) {
    super();
    this.pageConfig.isDetailPage = false;
    this.id = this.navParams.get('id');
    this.amount = this.navParams.get('amount');
    this.IDBusinessPartner = this.navParams.get('IDBusinessPartner');
    this.SelectedOrderList = this.navParams.get('SelectedOrderList');
    this.canEdit = this.navParams.get('canEdit');
    this.query.IDOutgoingPayment = this.navParams.get('IDOutgoingPayment');
    this.canEditAmount = this.navParams.get('canEditAmount');
    this.amountInvoice= this.navParams.get('amountInvoice');
  }

  preLoadData(event) {
    this.query.IDVendor = this.IDBusinessPartner;
    this.query.Amount_gt = 0;
    this.sortToggle('OrderDate', true);
    super.preLoadData(event);
  }

  total: any = {
    Amount: 0,
  };

  loadData(event = null) {
      this.parseSort();
      if (this.pageProvider && !this.pageConfig.isEndOfData) {
        if (event == 'search') {
          this.pageProvider.read(this.query, this.pageConfig.forceLoadData).then((result: any) => {
            if (result.length == 0) {
              this.pageConfig.isEndOfData = true;
            }
            this.items = result.data;
            this.loadedData(null);
          });
        } else {
          this.query.Skip = this.items.length;
          this.commonService.connect('GET','PURCHASE/Order/GetPurchaseOrdersDebt/',this.query).toPromise()
            .then((result: any) => {
              if (result.length == 0) {
                this.pageConfig.isEndOfData = true;
              }
              if (result.length > 0) {
                let firstRow = result[0];

                //Fix dupplicate rows
                if (this.items.findIndex((d) => d.Id == firstRow.Id) == -1) {
                  this.items = [...this.items, ...result];
                }
              }

              this.loadedData(event);
            })
            .catch((err) => {
              if (err.message != null) {
                this.env.showMessage(err.message, 'danger');
              } else {
                this.env.showMessage('Cannot extract data', 'danger');
              }

              this.loadedData(event);
            });
        }
      } else {
        this.loadedData(event);
      }
    
  }

  loadedData(event) {
    this.selectedItems = [];
    this.items.forEach((i) => {
      i._BusinessPartner ={
        Id : i._Vendor.Id,
        Name : i._Vendor.Name ,
        Code : i._Vendor.Code,
        Address : i._Vendor.BillingAddress
      }
      
      i.OrderTimeText = i.OrderDate ? lib.dateFormat(i.OrderDate, 'hh:MM') : '';
      i.OrderDateText = i.OrderDate ? lib.dateFormat(i.OrderDate, 'dd/mm/yy') : '';
      i.Query = i.OrderDate ? lib.dateFormat(i.OrderDate, 'yyyy-mm-dd') : '';
      i.OriginalDebt = i._Debt;
      i.PaidAmount = '';
      i.Debt = lib.currencyFormat(i._Debt);
    });
    this.total.Amount = this.amount;
    super.loadedData(event);
    if (this.SelectedOrderList?.length) {
      this.SelectedOrderList.forEach((s) => {
        let order = this.items.find((i) => i.Id == s.IDOrder);
        if (order) {
          order.checked = true;
          order.PaidAmount = s.Amount ? s.Amount : s.PaidAmount;
          order.IDPaymentDetail = s.Id;
          this.selectedItems.push(order);

        }
        else {
          s.isDisabled = true;
          s.title = 'This order has been paid!'
          s.checked = false;
          s.PaidAmount = 0;
          this.items.unshift(s);
        }
      });
    } else {
      this.autoSelect();
    }
    if(!this.canEdit) this.canEditAmount = false;
  }

 
  changeSelection(i, e = null) {
    let validAmount = parseFloat(this.amount) - parseFloat(this.selectedItems.reduce((sum, item) => sum + (item.PaidAmount || 0), 0));
    if(!this.canEditAmount){
      if (!i.checked) {
        //let amount =  parseFloat(this.amountOrder || 0)  +parseFloat( i.OriginalDebt|| 0 )+ parseFloat( this.selectedItems.map((x) => x.PaidAmount).reduce((a, b) => +a + +b, 0)|| 0);
        if (!(validAmount > 0)) {
          i.checked = false;
          e?.preventDefault();
          this.env.showMessage('Số tiền thanh toán khả dụng không đủ', 'danger');
          return;
        }
      }
    }

    super.changeSelection(i, e);
    if (i.checked) {
      i.checked = false;
      i.PaidAmount = '';
    } else {
      i.checked = true;
      if(validAmount > 0 && !this.canEditAmount){
        i.PaidAmount = validAmount;
        if(i.PaidAmount >i.OriginalDebt) i.PaidAmount = i.OriginalDebt
      }
      else i.PaidAmount = i.OriginalDebt;
    }
    this.autoCalculateTotalAmount();
  }

  SaveSelectedOrders() {
    if(this.canEditAmount && parseFloat(this.total.Amount)  > parseFloat(this.selectedItems.reduce((sum, item) => sum + (item.PaidAmount || 0), 0))){
      this.env
      .showPrompt('Số tiền thanh toán lớn hơn tổng tiền các hóa đơn', null, 'Không thể lưu','Adjusted', 'Close')
      .then((_) => {

      }).catch(err=>{
        this.modalController.dismiss(null);
      });
    }
    this.selectedItems.forEach((i) => {
      (i.IDOrder = i.Id),
        (i.Id = 0),
        (i.IDBusinessPartner = i._BusinessPartner.Id),
        (i.IDPaymentDetail = i.IDPaymentDetail),
        (i.Name = i.Name),
        (i.Amount = i.PaidAmount)
    });
    this.selectedItems.Amount = this.total.Amount;
    this.modalController.dismiss(this.selectedItems);
  }

  isAllChecked = false;
  toggleSelectAll() {
    let total = 0;
    if(!this.canEditAmount){
      if(this.isAllChecked){
        total = parseFloat(this.selectedItems.reduce((sum, item) => sum + (item.PaidAmount || 0), 0))
        let validAmount = this.amount - total;
        if(validAmount  >0) {
          this.items.filter(s=> !this.selectedItems.includes(s.Id) && !s.isDisabled).forEach((i)=>{
            if(validAmount  >0) {
            if(validAmount >= i.OriginalDebt ) i.PaidAmount = i.OriginalDebt;
            else i.PaidAmount = validAmount;
            validAmount -= i.PaidAmount;
            i.checked=true;
            super.changeSelection(i);

            }
          })
        }
      } else {
        this.items.forEach((i)=>{
          i.checked=false;
        })
        this.selectedItems = [];
    }
    }
    else{
      this.items.filter(d=> !d.isDisabled).forEach((i) => {
        i.checked = this.isAllChecked;
        if (i.checked) {
          total += i.OriginalDebt;
          this.total.Amount = total;
          i.PaidAmount = i.OriginalDebt;
        } else {
          i.PaidAmount = '';
          this.total.Amount = 0;
        }
      });
      this.selectedItems = this.isAllChecked ? [...this.items] : [];
    }    
   
    super.changeSelection({});
  }


  autoSelect() {
    let totalDebt = this.total.Amount;
    this.selectedItems = [];
    this.items.forEach((i) => {
      if(totalDebt > 0){
        i.checked = true;
        if (totalDebt >= i.OriginalDebt) {
          i.PaidAmount = i.OriginalDebt;
          super.changeSelection(i);
        } else {
          if( totalDebt < i.OriginalDebt) i.PaidAmount =totalDebt; 
        }
        totalDebt = totalDebt - i.PaidAmount;
      }
      else i.checked = false;
    });
    this.selectedItems = this.items.filter((d) => d.checked);
  }

  changePaidAmount(i, e = null) {
    if (!this.canEditAmount) {
      let validAmount = parseFloat(this.amount) - parseFloat(this.selectedItems.filter(a=> a.Id != i.Id).reduce((sum, item) => sum + (item.PaidAmount || 0), 0));
      if(validAmount >0 ){
        if( i.PaidAmount >= validAmount ){
          i.PaidAmount = validAmount;
          if(i.PaidAmount >i.OriginalDebt) i.PaidAmount = i.OriginalDebt
        }
      }else   i.PaidAmount ='';
      return;
    }
    else if (i.PaidAmount <= 0 || i.PaidAmount >= i.OriginalDebt || i.PaidAmount == null) {
      i.PaidAmount = i.OriginalDebt;
    } 
    this.autoCalculateTotalAmount();
  }


  autoCalculateTotalAmount() {
    if (!this.canEditAmount) {
      return;
    }
    let total = 0;
    this.items.forEach((i) => {
      if (i.checked) {
        total += i.PaidAmount;
      }
    });
    this.total.Amount = total;
    this.selectedItems = this.items.filter((d) => d.checked);
  }
}
