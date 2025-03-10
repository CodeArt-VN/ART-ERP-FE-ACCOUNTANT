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
	selector: 'app-incoming-payment-sale-order-modal',
	templateUrl: './incoming-payment-sale-order-modal.page.html',
	styleUrls: ['./incoming-payment-sale-order-modal.page.scss'],
	standalone: false,
})
export class IncomingPaymentSaleOrderModalPage extends PageBase {
	IDContact;
	amount;
	SelectedOrderList: any;
	canEditAmount;
	amountInvoice;
	provider: any;
	constructor(
		public pageProvider: SALE_OrderProvider,
		public commonService: CommonService,
		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,

		public modalController: ModalController,
		public alertCtrl: AlertController,
		public navParams: NavParams,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController
	) {
		super();
		this.pageConfig.isDetailPage = false;
		this.id = this.route.snapshot.paramMap.get('id');
		this.amount = this.route.snapshot.paramMap.get('amount');
		this.IDContact = this.route.snapshot.paramMap.get('IDContact');
		this.SelectedOrderList = this.route.snapshot.paramMap.get('SelectedOrderList');
		this.canEditAmount = this.route.snapshot.paramMap.get('canEditAmount');
		this.amountInvoice = this.route.snapshot.paramMap.get('amountInvoice');
		// this.provider = this.route.snapshot.paramMap.get('provider');
	}

	preLoadData(event) {
		this.query.IDContact = this.IDContact;
		this.query.Debt_gt = 0;
		this.sortToggle('OrderDate', true);
		// if( this.provider  == "PURCHASE") {
		//   this.pageProvider = new PURCHASE_OrderProvider(this.commonService);
		// }
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
		if (this.SelectedOrderList.length) {
			this.SelectedOrderList.forEach((s) => {
				let so = this.items.find((i) => i.Id == (s.IDSaleOrder || s.IDOrder));
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
			let amount =
				parseFloat(this.amountInvoice || 0) +
				parseFloat(i.DebtAmountBefore || 0) +
				parseFloat(this.selectedItems.map((x) => x.DebtAmount).reduce((a, b) => +a + +b, 0) || 0);
			if (amount > this.amount) {
				i.checked = false;
				this.env.showMessage('Số tiền của hóa đơn thanh toán đã vượt số tiền thanh toán', 'danger');
				e?.preventDefault();
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
			(i.IDSaleOrder = i.Id),
				(i.IDOrder = i.Id),
				(i.Id = 0),
				(i.IDCustomer = i._Customer.Id),
				(i.IDIncomingPaymentDetail = i.IDIncomingPaymentDetail),
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
			}
		});
		if (this.canEditAmount) this.total.Amount = 0;
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
