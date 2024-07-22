import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { AC_ARInvoiceProvider } from 'src/app/services/static/services.service';
import { FormBuilder } from '@angular/forms';
import { lib } from 'src/app/services/static/global-functions';

@Component({
  selector: 'app-incoming-payment-invoice-modal',
  templateUrl: './incoming-payment-invoice-modal.page.html',
  styleUrls: ['./incoming-payment-invoice-modal.page.scss'],
})
export class IncomingPaymentInvoiceModalPage extends PageBase {
  IDBusinessPartner;
  amount;
  SelectedInvoiceList: any;
  canEditAmount;
  amountOrder;
  constructor(
    public pageProvider: AC_ARInvoiceProvider,
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
    this.SelectedInvoiceList = this.route.snapshot.paramMap.get('SelectedInvoiceList');
    this.canEditAmount = this.route.snapshot.paramMap.get('canEditAmount');
    this.amountOrder = this.route.snapshot.paramMap.get('amountInvoice');
  }

  preLoadData(event) {
    this.query.IDBusinessPartner = this.IDBusinessPartner;
    this.query.TotalAfterTax_gt = 0;
    this.sortToggle('OrderDate', true);
    super.preLoadData(event);
  }

  total: any = {
    Amount: 0,
  };

  loadedData(event) {
    this.selectedItems = [];
    this.items.forEach((i) => {
      i.OrderTimeText = i.InvoiceDate ? lib.dateFormat(i.InvoiceDate, 'hh:MM') : '';
      i.OrderDateText = i.InvoiceDate ? lib.dateFormat(i.InvoiceDate, 'dd/mm/yy') : '';
      i.Query = i.InvoiceDate ? lib.dateFormat(i.InvoiceDate, 'yyyy-mm-dd') : '';
      i.DebtAmountBefore = i.TotalAfterTax;
      i.DebtAmount = '';
      i.Debt = lib.currencyFormat(i.TotalAfterTax);
    });
    this.total.Amount = this.amount;
    super.loadedData(event);
    if (this.SelectedInvoiceList.length) {
      this.SelectedInvoiceList.forEach((s) => {
        let so = this.items.find((i) => i.Id == s.IDInvoice);
        if (so) {
          so.checked = true;
          so.DebtAmount = s.Amount ? s.Amount : s.DebtAmount;
          so.IDIncomingPaymentDetail = s.Id;
          so.isEdit = false;
          this.selectedItems.push(so);
        }
      });
    } else {
      this.autoSelect();
    }
  }

  changeSelection(i, e = null) {
    if (!this.canEditAmount && !i.checked) {
      let amount =  this.amountOrder + i.DebtAmountBefore + this.selectedItems.map((x) => x.DebtAmount).reduce((a, b) => +a + +b, 0);
      if (amount > this.amount) {
        i.checked = false;
        e?.preventDefault();
        this.env.showMessage('Số tiền của hóa đơn thanh toán đã vượt số tiền thanh toán', 'danger');
        return;
      }
    }

    super.changeSelection(i, e);
    if (i.checked) {
      i.checked = false;
      i.DebtAmount = '';
    } else {
      i.checked = true;
      i.isEdit = true;
      i.DebtAmount = i.DebtAmountBefore;
    }
    this.autoCalculateTotalAmount();
  }

  SaveSelectedOrders() {
    this.selectedItems.forEach((i) => {
      (i.IDInvoice = i.Id),
        (i.Id = 0),
        (i.IDIncomingPaymentDetail = i.IDIncomingPaymentDetail),
        (i.IDCustomer = i.IDBusinessPartner),
        (i.Name = i.Name),
        (i.Amount = i.DebtAmount);
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
        total += i.DebtAmountBefore;
        this.total.Amount = total;
        i.DebtAmount = i.DebtAmountBefore;
      } else {
        i.DebtAmount = '';
        this.total.Amount = 0;
      }
    });
    this.selectedItems = this.isAllChecked ? [...this.items] : [];
    super.changeSelection({});
  }

  autoSelect() {
    let totalDebt = this.total.Amount;
    this.items.forEach((i) => {
      if (totalDebt >= i.DebtAmountBefore) {
        i.checked = true;
        i.DebtAmount = i.DebtAmountBefore;
        super.changeSelection(i);
      } else {
        i.DebtAmount = '';
        i.checked = false;
      }
      totalDebt = totalDebt - i.DebtAmount;
    });
    this.selectedItems = this.items.filter((d) => d.checked);
  }

  changeDebtAmountSelection(i, e = null) {
    if (i.DebtAmount <= 0 || i.DebtAmount >= i.DebtAmountBefore || i.DebtAmount == null) {
      i.DebtAmount = i.DebtAmountBefore;
      i.isEdit = false;
    } else {
      i.isEdit = true;
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
        total += i.DebtAmount;
      }
    });
    this.total.Amount = total;
    this.selectedItems = this.items.filter((d) => d.checked);
  }
}
