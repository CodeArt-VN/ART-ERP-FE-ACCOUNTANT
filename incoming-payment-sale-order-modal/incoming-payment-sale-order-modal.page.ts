import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { SALE_OrderProvider } from 'src/app/services/static/services.service';
import { FormBuilder } from '@angular/forms';
import { lib } from 'src/app/services/static/global-functions';

@Component({
  selector: 'app-incoming-payment-sale-order-modal',
  templateUrl: './incoming-payment-sale-order-modal.page.html',
  styleUrls: ['./incoming-payment-sale-order-modal.page.scss'],
})
export class IncomingPaymentSaleOrderModalPage extends PageBase {
  IDContact;
  amount;
  SelectedOrderList: any;
  constructor(
    public pageProvider: SALE_OrderProvider,
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
    this.IDContact = this.route.snapshot.paramMap.get('IDContact');
    this.SelectedOrderList = this.route.snapshot.paramMap.get('SelectedOrderList');
  }

  preLoadData(event) {
    this.query.IDContact = this.IDContact;
    this.query.Debt_gt = 0;
    this.sortToggle('Id_desc', true);
    super.preLoadData(event);
  }

  total: any = {
    Amount: 0,
  };

  loadedData(event) {
    this.selectedItems = [];

    this.items.forEach((i) => {
      i.CustomerName = i._Customer.Name;
      i.CustomerAddress = i._Customer.Address;
      i.OrderTimeText = i.OrderDate ? lib.dateFormat(i.OrderDate, 'hh:MM') : '';
      i.OrderDateText = i.OrderDate ? lib.dateFormat(i.OrderDate, 'dd/mm/yy') : '';
      i.Query = i.OrderDate ? lib.dateFormat(i.OrderDate, 'yyyy-mm-dd') : '';
      i.DebtAmountBefore = i.Debt;
      i.DebtAmount = '';
      i.Debt = lib.currencyFormat(i.Debt);
    });
    this.total.Amount = this.amount;
    super.loadedData(event);
    if(this.SelectedOrderList.length){
      
      this.SelectedOrderList.forEach((s) => {
        let so = this.items.find(i => i.Id == s.IDSaleOrder);
        if(so) {
          so.checked = true;
          so.DebtAmount = s.Amount? s.Amount : s.DebtAmount;
          so.IDIncomingPaymentDetail = s.Id;
          so.isEdit = false;
        }
      });
    }else {
      this.autoSelect();
    }
  }

  changeSelection(i, e = null) {
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
      (i.IDSaleOrder = i.Id), (i.Id = 0), (i.IDCustomer = i._Customer.Id), (i.IDIncomingPaymentDetail = i.IDIncomingPaymentDetail), (i.Name = i.Name), (i.Amount = i.DebtAmount);
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
    let totalDebt = 0;
    this.items.forEach((i) => {
      totalDebt += i.DebtAmountBefore;
      if (totalDebt <= this.total.Amount) {
        i.checked = true;
        i.DebtAmount = i.DebtAmountBefore;
        super.changeSelection(i);
      } else {
        i.DebtAmount = '';
        i.checked = false;
      }
    });
    this.selectedItems = this.items.filter((d) => d.checked);
  }
  changeDebtAmountSelection(i, e = null) {
    if (i.DebtAmount <= 0 || i.DebtAmount >= i.DebtAmountBefore || i.DebtAmount == null) {
      i.DebtAmount = i.DebtAmountBefore;
      i.isEdit = false;
    }else {
      i.isEdit = true;
    }
    this.autoCalculateTotalAmount();
  }

  autoCalculateTotalAmount() {
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
