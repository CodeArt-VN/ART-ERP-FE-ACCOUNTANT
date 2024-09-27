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
  amount;
  SelectedInvoiceList: any;
  canEditAmount;
  amountOrder;
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
    this.id = this.route.snapshot.paramMap.get('id');
    this.amount = this.route.snapshot.paramMap.get('amount');
    this.IDBusinessPartner = this.route.snapshot.paramMap.get('IDBusinessPartner');
    this.query.IDOutgoingPayment = this.navParams.get('IDOutgoingPayment');
    this.SelectedInvoiceList = this.route.snapshot.paramMap.get('SelectedInvoiceList');
    this.canEditAmount = this.route.snapshot.paramMap.get('canEditAmount');
    this.amountOrder = this.route.snapshot.paramMap.get('amountInvoice');
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
      i.OrderTimeText = i.InvoiceDate ? lib.dateFormat(i.InvoiceDate, 'hh:MM') : '';
      i.OrderDateText = i.InvoiceDate ? lib.dateFormat(i.InvoiceDate, 'dd/mm/yy') : '';
      i.Query = i.InvoiceDate ? lib.dateFormat(i.InvoiceDate, 'yyyy-mm-dd') : '';
      i.OriginalDebt = i._Debt;
      i.PaidAmount = '';
      i.Debt = lib.currencyFormat(i._Debt);
    });
    this.total.Amount = this.amount;
    super.loadedData(event);
    if (this.SelectedInvoiceList.length) {
      this.SelectedInvoiceList.forEach((s) => {
        let so = this.items.find((i) => i.Id == s.DocumentEntry);
        if (so) {
          so.checked = true;
          so.PaidAmount = s.Amount ? s.Amount : s.PaidAmount;
          so.IDOutgoingPaymentDetail = s.Id;
          this.selectedItems.push(so);
        }
      });
    } else {
      this.autoSelect();
    }
  }

  changeSelection(i, e = null) {
    let validAmount = this.amount - this.selectedItems.reduce((sum, item) => sum + (item.PaidAmount || 0), 0);
    if (!this.canEditAmount && !i.checked) {
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
      if(validAmount > i.OriginalDebt) i.PaidAmount = i.OriginalDebt;
      else i.PaidAmount = validAmount;
    }
    this.autoCalculateTotalAmount();
  }

  SaveSelectedOrders() {
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
    this.items.forEach((i) => {
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
    super.changeSelection({});
  }

  autoSelect() {
    let totalDebt = this.total.Amount;
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
    });
    this.selectedItems = this.items.filter((d) => d.checked);
  }

  changeDebtAmountSelection(i, e = null) {
    if (i.PaidAmount <= 0 || i.PaidAmount >= i.OriginalDebt || i.PaidAmount == null) {
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
