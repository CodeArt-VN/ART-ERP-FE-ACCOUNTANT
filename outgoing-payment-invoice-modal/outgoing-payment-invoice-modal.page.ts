import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { AC_APInvoiceProvider, AC_ARInvoiceProvider } from 'src/app/services/static/services.service';
import { FormBuilder } from '@angular/forms';
import { lib } from 'src/app/services/static/global-functions';
import { CommonService } from 'src/app/services/core/common.service';

@Component({
  selector: 'app-outgoing-payment-invoice-modal',
  templateUrl: './outgoing-payment-invoice-modal.page.html',
  styleUrls: ['./outgoing-payment-invoice-modal.page.scss'],
})
export class OutgoingPaymentInvoiceModalPage extends PageBase {
  IDBusinessPartner;
  DefaultBusinessPartner;
  amount;
  SelectedInvoiceList: any;
  canEditAmount;
  isLockAmount = true;
  canEdit;
  amountOrder;
  differenceAmount = 0;

  constructor(
    public pageProvider: AC_APInvoiceProvider,
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
    // this.id = this.route.snapshot.paramMap.get('id');
    // this.amount = this.route.snapshot.paramMap.get('amount');
    // this.IDBusinessPartner = this.route.snapshot.paramMap.get('IDBusinessPartner');
    this.query.IDOutgoingPayment = this.navParams.get('IDOutgoingPayment');
    // this.SelectedInvoiceList = this.route.snapshot.paramMap.get('SelectedInvoiceList');
    // this.canEditAmount = this.route.snapshot.paramMap.get('canEditAmount');
    // this.canEdit = this.navParams.get('canEdit');
    // this.amountOrder = this.route.snapshot.paramMap.get('amountOrder');
  }

  preLoadData(event) {
    this.query.IDSeller = this.IDBusinessPartner;
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
        this.commonService.connect('GET','AC/APInvoice/GetAPInvoicesDebt/',this.query).toPromise()
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
      i.InvoiceTimeText = i.InvoiceDate ? lib.dateFormat(i.InvoiceDate, 'hh:MM') : '';
      i.InvoiceDateText = i.InvoiceDate ? lib.dateFormat(i.InvoiceDate, 'dd/mm/yy') : '';
      i.Query = i.InvoiceDate ? lib.dateFormat(i.InvoiceDate, 'yyyy-mm-dd') : '';
      i.OriginalDebt = i._Debt;
      i.PaidAmount = '';
      i.Debt = lib.currencyFormat(i._Debt);
      if(!this.DefaultBusinessPartner){
        this.DefaultBusinessPartner = i._Seller;
      }
    });
    this.total.Amount = this.amount;
    super.loadedData(event);
    if (this.SelectedInvoiceList.length) {
      this.SelectedInvoiceList.forEach((s) => {
        let invoice = this.items.find((i) => i.Id == s.DocumentEntry);
        if (invoice) {
          invoice.checked = true;
          invoice.PaidAmount = s.Amount ? s.Amount : s.PaidAmount;
          invoice.IDOutgoingPaymentDetail = s.Id;
          this.selectedItems.push(invoice);
        }
        else {
          s.isDisabled = true;
          s.PaidAmount = s.Amount ? s.Amount : s.PaidAmount;
          s.title = 'This invoice was paid!';
          s._Seller =  this.DefaultBusinessPartner ;
          s.checked = false;
          s.PaidAmount = 0;
          this.items.unshift(s);

        }
      });
    } else {
      this.autoSelect();
    }
    this.calcDifferenceAmount();

    if(!this.canEdit) this.canEditAmount = false;

  }

  changeSelection(i, e = null) {
    let validAmount = parseFloat(this.amount) - parseFloat(this.selectedItems.reduce((sum, item) => sum + (item.PaidAmount || 0), 0));
    if (!i.checked) {
      //let amount =  parseFloat(this.amountOrder || 0)  +parseFloat( i.OriginalDebt|| 0 )+ parseFloat( this.selectedItems.map((x) => x.PaidAmount).reduce((a, b) => +a + +b, 0)|| 0);
      if (!(validAmount > 0)) {
        i.checked = false;
        e?.preventDefault();
        this.env.showMessage('Số tiền thanh toán khả dụng không đủ', 'danger');
        return;
      }
    }
    super.changeSelection(i, e);
    if (i.checked) {
      i.checked = false;
      i.PaidAmount = '';
    } else {
      i.checked = true;
      if(validAmount > 0){
        i.PaidAmount = validAmount;
        if(i.PaidAmount >i.OriginalDebt) i.PaidAmount = i.OriginalDebt
      }
      else i.PaidAmount = i.OriginalDebt;
    }
    this.calcDifferenceAmount();

  }

  SaveSelectedOrders() {
    this.selectedItems = this.selectedItems.filter(d=> d.PaidAmount != 0);
    this.selectedItems.forEach((i) => {
      (i.IDInvoice = i.Id),
        (i.Id = 0),
        (i.IDPaymentDetail = i.IDOutgoingPaymentDetail),
        (i.IDBusinessPartner = i.IDBusinessPartner),
        (i.Name = i.Name),
        (i.Amount = i.PaidAmount);
    });
    this.selectedItems.Amount = this.total.Amount;
    this.modalController.dismiss(this.selectedItems);
   
  }

  isAllChecked = false;
  toggleSelectAll() {
    let total = 0;
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
    super.changeSelection({});
    this.calcDifferenceAmount();

  }

  autoSelect() {
    let totalPaid = this.total.Amount;
    this.selectedItems = [];
    this.items.forEach((i) => {
      if(totalPaid > 0){
        i.checked = true;
        if (totalPaid >= i.OriginalDebt) {
          i.PaidAmount = i.OriginalDebt;
          super.changeSelection(i);
        } else {
          if( totalPaid < i.OriginalDebt) i.PaidAmount =totalPaid; 
        }
        totalPaid = totalPaid - i.PaidAmount;
      }
      else i.checked = false;
    });
    this.selectedItems = this.items.filter((d) => d.checked);
    this.calcDifferenceAmount();

  }

  changePaidAmount(i, e = null) {
    let validAmount = parseFloat(this.total.Amount) - parseFloat(this.selectedItems.filter(d=> d.Id != i.Id).reduce((sum, item) => sum + (item.PaidAmount || 0), 0));
    if(validAmount >0 ){
      if( i.PaidAmount >= validAmount) i.PaidAmount = validAmount;
      if(i.PaidAmount >i.OriginalDebt) i.PaidAmount = i.OriginalDebt;
      validAmount -=  i.PaidAmount;
    }
    else {
      i.PaidAmount = '';
      i.checked = false;
      super.changeSelection(i, e);
    };
    this.calcDifferenceAmount();
   // this.autoCalculateTotalAmount();
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
  calcDifferenceAmount(){
    this.differenceAmount = this.total.Amount - parseFloat(this.selectedItems.reduce((sum, item) => sum + (item.PaidAmount || 0), 0));
  }
}
