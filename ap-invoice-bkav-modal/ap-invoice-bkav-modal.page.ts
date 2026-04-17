import { Component } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { AC_APInvoiceProvider } from 'src/app/services/static/services.service';

@Component({
	selector: 'app-ap-invoice-bkav-modal',
	templateUrl: './ap-invoice-bkav-modal.page.html',
	styleUrls: ['./ap-invoice-bkav-modal.page.scss'],
	standalone: false,
})
export class APInvoiceBKAVModalPage extends PageBase {
	invoices: any[] = [];
	selectedItems: any[] = [];
	selectableItems: any[] = [];
	addResult: any;
	query: any = {};
	totalSelected = 0;
	isCheckedAll = false;

	constructor(
		public pageProvider: AC_APInvoiceProvider,
		public modalController: ModalController,
		public env: EnvService,
		public navParams: NavParams
	) {
		super();
		this.pageConfig.isShowSearch = false;
		this.invoices = (this.navParams?.data?.invoices || []).map((i) => ({
			...i,
			Selected: false,
			checked: false,
		}));
		this.selectableItems = this.invoices.filter((i) => this.canSelect(i));
		this.selectedItems = [];
		this.syncSelectedItems();
	}

	canSelect(invoice) {
		return invoice && !invoice.IsAdded;
	}

	onSelectedRowsChange(rows) {
		this.selectedItems = (rows || []).filter((i) => this.canSelect(i));
		this.syncSelectedItems();
	}

	toggleAll(checked: boolean) {
		this.selectedItems = checked ? [...this.selectableItems] : [];
		this.syncSelectedItems();
	}

	toggleRow(invoice, checked: boolean) {
		if (!this.canSelect(invoice)) return;

		if (checked) {
			if (!this.selectedItems.includes(invoice)) {
				this.selectedItems = [...this.selectedItems, invoice];
			}
		} else {
			this.selectedItems = this.selectedItems.filter((i) => i !== invoice);
		}

		this.syncSelectedItems();
	}

	syncSelectedItems() {
		this.selectedItems = this.invoices.filter((i) => this.selectedItems.includes(i) && this.canSelect(i));
		this.selectableItems = this.invoices.filter((i) => this.canSelect(i));
		this.totalSelected = this.selectedItems.length;
		this.isCheckedAll = this.selectableItems.length > 0 && this.totalSelected == this.selectableItems.length;
		this.invoices.forEach((i) => {
			i.checked = this.selectedItems.includes(i);
			i.Selected = i.checked;
		});
	}

	addSelected() {
		const selectedInvoices = this.selectedItems.filter((i) => this.canSelect(i));
		if (selectedInvoices.length == 0 || this.submitAttempt) return;
		this.submitAttempt = true;
		this.env
			.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('POST', 'AC/APInvoice/BKAV/Add', { Invoices: selectedInvoices }).toPromise())
			.then((resp: any) => {
				this.addResult = resp;
				const added = resp?.length || 0;
				this.env.showMessage(`Added: ${added}`, 'success');
				this.modalController.dismiss(resp, 'added');
			})
			.catch((err) => {
				this.env.showMessage(err.error?.Message || err.error || err.message || err, 'danger');
			})
			.finally(() => {
				this.submitAttempt = false;
			});
	}

	dismiss() {
		this.modalController.dismiss();
	}
}
