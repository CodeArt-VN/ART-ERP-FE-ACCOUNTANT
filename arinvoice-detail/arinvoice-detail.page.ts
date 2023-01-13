import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, ModalController, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { SALE_OrderProvider, BRA_BranchProvider, HRM_StaffProvider, CRM_ContactProvider, SALE_OrderDetailProvider, AC_ARInvoiceProvider, AC_ARInvoiceDetailProvider, AC_ARInvoiceSODetailProvider, WMS_ItemProvider, SYS_StatusProvider, SYS_TypeProvider } from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { NgSelectConfig } from '@ng-select/ng-select';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, skip, switchMap, tap } from 'rxjs/operators';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { lib } from 'src/app/services/static/global-functions';

import { EInvoiceService } from 'src/app/services/einvoice.service';
import { SaleOrderMobileAddContactModalPage } from 'src/app/pages/SALE/sale-order-mobile-add-contact-modal/sale-order-mobile-add-contact-modal.page';

@Component({
	selector: 'app-arinvoice-detail',
	templateUrl: './arinvoice-detail.page.html',
	styleUrls: ['./arinvoice-detail.page.scss'],
})
export class ARInvoiceDetailPage extends PageBase {
	statusList = [];
	statusEInvoiceList = [];
	typeList = [];
	paymentMethodList = [];
	receiveTypeList = [];
	invoiceFormList = [];
	invoiceSerialList = [];
	typeCreateInvoiceList = [];

	initContactsIds = [];
	branch = null;

	constructor(
		public pageProvider: AC_ARInvoiceProvider,
		public arInvoiceDetailProvider: AC_ARInvoiceDetailProvider,
		public arInvoiceSODetailProvider: AC_ARInvoiceSODetailProvider,
		public orderProvider: SALE_OrderProvider,
		public orderDetailProvider: SALE_OrderDetailProvider,
		public branchProvider: BRA_BranchProvider,
		public contactProvider: CRM_ContactProvider,
		public itemProvider: WMS_ItemProvider,
		public statusProvider: SYS_StatusProvider,
		public typeProvider: SYS_TypeProvider,
		public paymentMethodProvider: SYS_TypeProvider,
		public receiveTypeProvider: SYS_TypeProvider,
		public invoiceFormProvider: SYS_TypeProvider,
		public invoiceSerialProvider: SYS_TypeProvider,
		public typeCreateInvoiceProvider: SYS_TypeProvider,
		public staffPovider: HRM_StaffProvider,

		public EInvoiceService: EInvoiceService,

		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,
		public modalController: ModalController,
		public alertCtrl: AlertController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController,
		public commonService: CommonService,
		private config: NgSelectConfig
	) {
		super();
		this.item = {};
		this.pageConfig.isDetailPage = true;
		this.id = this.route.snapshot.paramMap.get('id');
		this.formGroup = formBuilder.group({

			IDBranch: new FormControl({ value: '', disabled: false })
			, IDBusinessPartner: new FormControl()
			, IDSaleOrder: new FormControl({ value: '', disabled: false })
			, Id: new FormControl({ value: '', disabled: true })
			, Code: new FormControl()
			, Name: new FormControl()
			, Remark: new FormControl()

			, Status: new FormControl({ value: 'ARInvoiceDraft', disabled: true })
			, Type: new FormControl({ value: 'InvoiceTypeVAT', disabled: false })
			, InvoiceDate: new FormControl({ value: '', disabled: true })
			, BuyerName: ['', Validators.required]
			, BuyerTaxCode: new FormControl()
			, BuyerAddress: new FormControl()
			, BuyerUnitName: ['', Validators.required]
			, BuyerBankAccount: new FormControl({ value: '', disabled: false })
			, PaymentMethod: new FormControl({ value: 'InCash/WireTransfer', disabled: false })
			, ReceiveType: new FormControl({ value: 'EInvoiceReceiveTypeEmail' , disabled: false })
			, ReceiverEmail: new FormControl()
			, ReceiverMobile: new FormControl()
			, ReceiverAddress: new FormControl()
			, ReceiverName: new FormControl()
			, UserDefine: new FormControl()
			, BillCode: new FormControl()
			, Currency: new FormControl()
			, ExchangeRate: new FormControl()
			, InvoiceGUID: new FormControl()
			, InvoiceForm: new FormControl({ value: 'InvoiceForm1', disabled: false })
			, InvoiceSerial: new FormControl({ value: '', disabled: false })
			, InvoiceNo: new FormControl({ value: '', disabled: true })
			, InvoiceCode: new FormControl({ value: '', disabled: true })
			, SignedDate: new FormControl({ value: '', disabled: true })
			, TypeCreateInvoice: new FormControl({ value: 'TypeCreateInvoiceGeneral', disabled: false })
			, OriginalInvoiceIdentify: new FormControl({ value: '', disabled: true })
			, IsCanceled: new FormControl()
			, TotalBeforeDiscount: new FormControl()
			, TotalDiscount: new FormControl()
			, TotalAfterDiscount: new FormControl()
			, Tax: new FormControl()
			, TotalAfterTax: new FormControl()

			, Sort: new FormControl()
			, IsDisabled: new FormControl()
			, IsDeleted: new FormControl()
			, CreatedBy: new FormControl()
			, ModifiedBy: new FormControl()
			, CreatedDate: new FormControl()
			, ModifiedDate: new FormControl()

			//InvoiceLines: new FormArray([])
		});

		//https://github.com/ng-select/ng-select
		this.config.notFoundText = 'Không tìm thấy dữ liệu phù hợp...';
		this.config.clearAllText = 'Xóa hết';
	}

	segmentView = 's2';

	segmentChanged(ev: any) {
		this.segmentView = ev.detail.value;
	}

	preLoadData(event) {
		Promise.all([
			this.env.getStatus('ARInvoiceStatus'),
			this.env.getStatus('EInvoiceStatus'),
			this.env.getType('PaymentMethod'),
			this.env.getType('InvoiceForm'),
			this.env.getType('InvoiceSerial'),
			this.env.getType('TypeCreateInvoice'),
			this.env.getType('InvoiceType'),
			this.env.getType('EInvoiceReceiveType'),

		]).then((values: any) => {

			this.statusList = values[0];
			this.statusEInvoiceList = values[1];
			this.paymentMethodList = values[2];
			this.invoiceFormList = values[3];
			this.invoiceSerialList = values[4];
			this.typeCreateInvoiceList = values[5];
			this.typeList = values[6];
			this.receiveTypeList = values[7];

			super.preLoadData(event);
		});

		super.preLoadData(event);
	}

	loadedData(event) {
		super.loadedData(event);

		if (this.item.Id) {

			let blockedStatus = [
				'EInvoiceRelease', 'EInvoiceNew', 'EInvoiceCancel', 'EInvoiceEmpty', 'ARInvoiceApproved', 'ARInvoicePending', 'ARInvoiceCanceled', 'ARInvoiceSplited', 'ARInvoiceMerged'
			];

			if (blockedStatus.indexOf(this.item.Status) > -1) {
				this.pageConfig.canEdit = false;
				this.pageConfig.canDelete = false;
				this.formGroup.get('IDBusinessPartner').disable();
			}
			else {
				this.pageConfig.canEdit = true;
				this.pageConfig.canDelete = true;

				if (this.item.TypeCreateInvoice != 'TypeCreateInvoice1') {
					this.formGroup.get('BuyerName').enable();
					this.formGroup.get('BuyerUnitName').enable();
					this.formGroup.get('BuyerAddress').enable();
					this.formGroup.get('BuyerTaxCode').enable();
					this.formGroup.get('ReceiverMobile').enable();
					this.formGroup.get('ReceiverEmail').enable();
					this.formGroup.get('ReceiveType').enable();
					this.formGroup.get('BuyerBankAccount').enable();

				}
				else {
					this.formGroup.get('BuyerName').disable();
					this.formGroup.get('BuyerUnitName').disable();
					this.formGroup.get('BuyerAddress').disable();
					this.formGroup.get('BuyerTaxCode').disable();
					this.formGroup.get('ReceiverMobile').disable();
					this.formGroup.get('ReceiverEmail').disable();
					this.formGroup.get('ReceiveType').disable();
					this.formGroup.get('BuyerBankAccount').disable();

				}
			}

			this.item.InvoiceDateText = lib.dateFormat(this.item.InvoiceDate, 'hh:MM dd/mm/yyyy');
			this.item.CreatedDateText = lib.dateFormat(this.item.CreatedDate, 'hh:MM dd/mm/yyyy');
			this.item.TotalAfterTaxText = lib.currencyFormat(this.item.TotalAfterTax);
			this.item.EInvoiceTotalText = lib.currencyFormat(this.item.TotalAfterTax);
			this.initContactsIds.push(this.item.IDBusinessPartner);
			this.item.Currency = "VND";

			if (this.pageConfig.canEditInvoiceDate) {
				this.formGroup.get('InvoiceDate').enable();
			}


			this.arInvoiceDetailProvider.read({ IDARInvoice: this.id }).then((result: any) => {
				this.item.InvoiceLines = result.data;

				let count = 0;
				this.item.InvoiceLines.forEach(line => {
					line._UoMPrice = line.UoMPrice;
					this.submitAttempt = true;
					this.calcInvoiceLine(line).then(() => {
						count++;
						if (count >= this.item.InvoiceLines.length) {
							this.calcInvoice();
							setTimeout(() => {
								this.submitAttempt = false;
							}, 0);
						}
					});
				});

				//super.loadedData(event, true);
				// for (let idx = 0; idx < this.item.InvoiceLines.length; idx++) {
				//     const InvoiceLine = this.item.InvoiceLines[idx];
				//     this.addInvoiceLineForm(InvoiceLine);
				// }

				let ids = this.item.InvoiceLines.map(i => i.IDItem);
				if (ids.length) {
					this.itemProvider.search({ IgnoredBranch: true, AllUoM: true, Id: JSON.stringify(ids) }).toPromise().then((result: any) => {
						result.forEach(i => {
							if (this.itemListSelected.findIndex(d => d.Id == i.Id) == -1) {
								this.itemListSelected.push(i);
							}
							let lines = this.item.InvoiceLines.filter(d => d.IDItem == i.Id);
							lines.forEach(line => {
								line._itemData = i;
							});
						});
					}).finally(() => {
						this.itemSearch();
						this.cdr.detectChanges();
					});
				}
				else {
					this.itemSearch();
					this.addInvoiceLine();
				}
			});

			this.loadRelatedARs(0);
		}
		else {
			if (!this.pageConfig.canEdit) {
				this.pageConfig.canEdit = this.pageConfig.canAdd;
			}
			this.item.InvoiceLines = [];
			super.loadedData(event, true);
		}

		if (this.initContactsIds.length) {
			this.contactProvider.read({ Id: JSON.stringify(this.initContactsIds) }).then((contacts: any) => {
				this.contactSelected = contacts.data[0];
				this.item.IDBusinessPartner = this.contactSelected.Id;
				contacts.data.forEach(contact => {
					if (contact && this.contactListSelected.findIndex(d => d.Id == contact.Id) == -1) {
						this.contactListSelected.push({ Id: contact.Id, Code: contact.Code, Name: contact.Name, WorkPhone: contact.WorkPhone, AddressLine1: contact.AddressLine1 });
					}
				});


			}).finally(() => {
				this.contactSearch();
				this.cdr.detectChanges();
			});
		}
		else {
			this.contactSearch();
		}

		if (this.item.IDBranch) {
			this.branchProvider.getAnItem(this.item.IDBranch).then((branch: any) => {
				this.branch = branch;
			})
		}


	}
	itemList$
	itemListLoading = false;
	itemListInput$ = new Subject<string>();
	itemListSelected = [];

	itemSearch() {
		this.itemListLoading = false;
		this.itemList$ = concat(
			of(this.itemListSelected),
			this.itemListInput$.pipe(
				distinctUntilChanged(),
				tap(() => this.itemListLoading = true),
				switchMap(term => this.itemProvider.search({ Take: 20, Skip: 0, Term: term }).pipe(
					catchError(() => of([])), // empty list on error
					tap(() => this.itemListLoading = false)
				))

			)
		);
	}

	async changedIDItem(selectedItem, line) {
		if (selectedItem) {
			if (this.itemListSelected.findIndex(d => d.Id == selectedItem.Id) == -1) {
				this.itemListSelected.push(selectedItem);
				this.itemSearch();
			}

			this.resetLine(line);

			line._itemData = selectedItem;
			line.TaxRate = selectedItem.Tax; //Tax by Item

			this.changedItemUoM(line);

			// if (this.item.InvoiceLines.findIndex(d => !d.IDItem) == -1) {
			//     this.addInvoiceLine();
			// }
		}
	}

	contactList$
	contactListLoading = false;
	contactListInput$ = new Subject<string>();
	contactListSelected = [];
	contactSelected = null;
	contactSearch() {
		this.contactListLoading = false;
		this.contactList$ = concat(
			of(this.contactListSelected),
			this.contactListInput$.pipe(
				distinctUntilChanged(),
				tap(() => this.contactListLoading = true),
				switchMap(term => this.contactProvider.search({ Take: 20, Skip: 0, Term: term ? term : this.item.IDContact }).pipe(
					catchError(() => of([])), // empty list on error
					tap(() => this.contactListLoading = false)
				))

			)
		);
	}
	async changedIDContact(i) {
		if (i) {


			this.contactSelected = i;
			this.item.IDBusinessPartner = i.Id;
			this.formGroup.controls.IDBusinessPartner.setValue(i.Id);
			this.formGroup.controls.IDBusinessPartner.markAsDirty();
			if (this.contactListSelected.findIndex(d => d.Id == i.Id) == -1) {
				this.contactListSelected.push(i);
				this.contactSearch();

				if (this.item.TypeCreateInvoice != 'TypeCreateInvoice1') {
					this.item.BuyerName = this.contactSelected.Name;
					if (this.contactSelected.CompanyName != null) this.item.BuyerUnitName = this.contactSelected.CompanyName;
					this.item.BuyerTaxCode = this.contactSelected.WorkPhone;
					if (this.contactSelected.Address.AddressLine1 != null) this.item.BuyerAddress = i.Address.AddressLine1;
					this.item.IDBusinessPartner = i.Id;
					this.item.ReceiverName = this.contactSelected.Name;
					this.item.ReceiverMobile = this.contactSelected.WorkPhone;
					this.item.ReceiverEmail = this.contactSelected.Email;
					this.item.Currency = "VND";


					this.formGroup.get('BuyerName').enable();
					this.formGroup.get('BuyerUnitName').enable();
					this.formGroup.get('BuyerAddress').enable();
					this.formGroup.get('BuyerTaxCode').enable();
					this.formGroup.get('ReceiverMobile').enable();
					this.formGroup.get('ReceiverEmail').enable();
					this.formGroup.get('ReceiveType').enable();
					this.formGroup.get('BuyerBankAccount').enable();

					this.formGroup.patchValue(this.item);
				}
				else {
					this.formGroup.get('BuyerName').disable();
					this.formGroup.get('BuyerUnitName').disable();
					this.formGroup.get('BuyerAddress').disable();
					this.formGroup.get('BuyerTaxCode').disable();
					this.formGroup.get('ReceiverMobile').disable();
					this.formGroup.get('ReceiverEmail').disable();
					this.formGroup.get('ReceiveType').disable();
					this.formGroup.get('BuyerBankAccount').disable();
				}
			}
			this.saveChange();
		}

	}

	changeIsPromotion(line) {
		console.log(line.IsPromotionItem);

		if (line.IsPromotionItem) {
			this.cdr.detach();

			line.TotalDiscount = 0;
			line.UoMPrice = 0;
			line.TotalBeforeDiscount = 0;
			line.TotalAfterDiscount = 0;
			line.TotalAfterTax = 0;
			line.Tax = 0;
			line.TaxRate = 0;

			this.cdr.markForCheck();
			setTimeout(() => {
				this.cdr.reattach()

				setTimeout(() => {
					this.changedItemUoM(line);
				}, 0);
			}, 0);
		}
		else {
			this.formGroup.patchValue(this.item);
			this.saveChange();
		}
	}

	isNeedReCalculate = false;
	changedItemUoM(line) {
		//debugger
		this.isNeedReCalculate = true;
		if (line.IDItem && line.IDUoM && line.Quantity) {
			this.calcInvoiceLine(line).then(() => {
				this.calcInvoice();
				this.isNeedReCalculate = false;
			});
		}
	}

	calcInvoiceLine(line) {
		return new Promise((resolve, reject) => {
			line.UoMPrice = parseFloat(line.UoMPrice) || 0;
			//line.BuyPrice = parseFloat(line.BuyPrice) || 0;

			line.Quantity = parseFloat(line.Quantity) || 0;

			if (line.IsPromotionItem) {
				resolve(true);
				return;
			}

			if (this.isNeedReCalculate) {
				line.TotalBeforeDiscount = line.UoMPrice * line.Quantity;
				line.TotalAfterDiscount = (line.TotalBeforeDiscount - line.TotalDiscount);
				line.Tax = (line.TotalAfterDiscount * (line.TaxRate / 100.0));
				line.TotalAfterTax = (line.TotalAfterDiscount + line.Tax);
			}
			else {
				line.TotalBeforeDiscount = line.UoMPrice * line.Quantity;
				line.TotalAfterDiscount = (line.TotalAfterTax / (1 + line.TaxRate / 100.0));
				line.Tax = (line.TotalAfterTax - line.TotalAfterTax / (1 + line.TaxRate / 100.0));
				//line.TotalAfterTax = (line.TotalAfterDiscount + line.Tax);
			}

			resolve(true);
		});
	}

	calcInvoice() {
		this.item.TaxRate = 0;
		this.item.TotalBeforeDiscount = 0;
		this.item.TotalDiscount = 0;
		this.item.TotalAfterDiscount = 0;
		this.item.Tax = 0;
		this.item.TotalAfterTax = 0;

		let validLines = this.item.InvoiceLines.filter(d => d.IDItem && d.IDUoM);

		for (let idx = 0; idx < validLines.length; idx++) {
			const line = validLines[idx];

			this.item.TotalBeforeDiscount += parseFloat(line.TotalBeforeDiscount);
			this.item.TotalDiscount += parseFloat(line.TotalDiscount);
			this.item.TotalAfterDiscount += parseFloat(line.TotalAfterDiscount);
			this.item.Tax += parseFloat(line.Tax);
			this.item.TotalAfterTax += parseFloat(line.TotalAfterTax);

			line.TotalBeforeDiscount = Number.parseFloat(line.TotalBeforeDiscount).toFixed(0);
			line.Tax = Number.parseFloat(line.Tax).toFixed(0);
			line.TotalDiscount = Number.parseFloat(line.TotalDiscount).toFixed(0);
			line.TotalAfterDiscount = Number.parseFloat(line.TotalAfterDiscount).toFixed(0);
			line.TotalAfterTax = Number.parseFloat(line.TotalAfterTax).toFixed(0);

		}

		this.item.TotalBeforeDiscount = Number.parseFloat(this.item.TotalBeforeDiscount).toFixed(0);
		this.item.Tax = Number.parseFloat(this.item.Tax).toFixed(0);
		this.item.TotalAfterDiscount = Number.parseFloat(this.item.TotalAfterDiscount).toFixed(0);
		this.item.TotalAfterTax = Number.parseFloat(this.item.TotalAfterTax).toFixed(0);

		this.item.TotalAfterTaxText = lib.currencyFormat(this.item.TotalAfterTax);
		this.item.EInvoiceTotalText = lib.currencyFormat(this.item.TotalAfterTax);

		this.formGroup.patchValue(this.item);
		this.saveChange();
	}

	addInvoiceLine() {
		this.item.InvoiceLines.push({
			IDOrder: this.item.Id,
			Id: 0,
			Quantity: 0,
			TaxRate: 0,
			Tax: 0,
			TotalDiscount: 0
		});
	}

	deleteInvoiceLine(line) {
		const index = this.item.InvoiceLines.indexOf(line);
		if (index > -1) {
			this.item.InvoiceLines.splice(index, 1);
		}
		this.calcInvoice();
	}

	resetLine(line) {
		line._itemData = null;
		line.IDUoM = null;
		line.TaxRate = 0;
		line.Quantity = 0;

		line.TotalBeforeDiscount = 0;
		line.TotalDiscount = 0;
		line.TotalAfterDiscount = 0;
		line.Tax = 0;
		line.TotalAfterTax = 0;
	}

	createEInvoice() {
		if (!this.pageConfig.canCreateEInvoice) {
			return;
		}

		let itemsCanNotProcess = this.selectedItems.filter(i => !(i.Status == 'ARInvoiceApproved'));
		if (itemsCanNotProcess.length == this.selectedItems.length) {
			this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.message.can-not-create-einvoice-approved-only', 'warning');
		}
		else {
			itemsCanNotProcess.forEach(i => {
				i.checked = false;
			});
			this.selectedItems = this.selectedItems.filter(i => (i.Status == 'ARInvoiceApproved'));

			this.alertCtrl.create({
				header: 'Xuất hóa đơn điện tử',
				//subHeader: '---',
				message: 'Bạn chắc muốn xác nhận xuất hóa đơn điện tử hóa đơn này?',
				buttons: [
					{
						text: 'Không',
						role: 'cancel',
						handler: () => {
							//console.log('Không xóa');
						}
					},
					{
						text: 'Xuất',
						cssClass: 'success-btn',
						handler: () => {

							if (this.submitAttempt == false) {
								this.submitAttempt = true;

								this.EInvoiceService.CreateEInvoice(this.item.Id, this.item.IDBranch)
									.then((resp: any) => {
										var json = JSON.parse(resp);

										if (json[0].MessLog != '') {
											this.env.showMessage(json[0].MessLog, 'warning');
											this.submitAttempt = false;
										}
										else {
											this.item.InvoiceNo = json[0].InvoiceNo;
											this.item.InvoiceGUID = json[0].InvoiceGUID;
											this.item.OriginalInvoiceIdentify = json[0].OriginalInvoiceIdentify;
											this.item.InvoiceCode = json[0].MTC;
											//this.item.InvoiceDate = new Date();
											this.item.Status = 'EInvoiceNew';

											this.formGroup.patchValue(this.item);
											this.pageProvider.save(this.item);

											this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.message.einvoice-success', 'success');
											this.submitAttempt = false;
										}
									})
									.catch(err => {
										console.log(err);

									})
							}

						}
					}
				]
			}).then(alert => {
				alert.present();
			})
		}
	}

	createAndSignEInvoice() {
		if (!this.pageConfig.canCreateAndSignEInvoice) {
			return;
		}

		let itemsCanNotProcess = this.selectedItems.filter(i => !(i.Status == 'ARInvoiceApproved'));
		if (itemsCanNotProcess.length == this.selectedItems.length) {
			this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.message.can-not-create-einvoice-approved-only', 'warning');
		}
		else {
			itemsCanNotProcess.forEach(i => {
				i.checked = false;
			});
			this.selectedItems = this.selectedItems.filter(i => (i.Status == 'ARInvoiceApproved'));

			this.alertCtrl.create({
				header: 'Xuất hóa đơn điện tử',
				//subHeader: '---',
				message: 'Bạn chắc muốn xác nhận xuất hóa đơn điện tử(và ký duyệt tự động) cho hóa đơn này?',
				buttons: [
					{
						text: 'Không',
						role: 'cancel',
						handler: () => {
							//console.log('Không xóa');
						}
					},
					{
						text: 'Xuất',
						cssClass: 'success-btn',
						handler: () => {

							if (this.submitAttempt == false) {
								this.submitAttempt = true;

								this.EInvoiceService.CreateAndSignEInvoice(this.id, this.item.IDBranch).then((resp: any) => {
									this.env.showTranslateMessage('erp.app.pages.accountant.ar-invoice.message.einvoice-sign-success', 'success');
									this.submitAttempt = false;
								})

							}

						}
					}
				]
			}).then(alert => {
				alert.present();
			})
		}
	}

	savedChange(savedItem = null, form = this.formGroup) {
		super.savedChange(savedItem, form)
		if (!this.item.InvoiceLines || this.item.InvoiceLines.length == 0) {
			this.refresh();
		}
	}

	saveChange() {
		if (this.submitAttempt) {
			return;
		}
		this.pageProvider.apiPath.postItem.url = function () { return ApiSetting.apiDomain("AC/ARInvoice/Add") };
		this.pageProvider.apiPath.putItem.url = function (id) { return ApiSetting.apiDomain("AC/ARInvoice/Update/") + id };

		if (this.pageConfig.canEdit) {
			return super.saveChange();
		}
		else {
			return null;
		}
	}

	changeTypeCreateInvoice() {

		if (this.formGroup.get("TypeCreateInvoice").value == 'TypeCreateInvoice1') {

			this.item.UserDefine = "Khách không lấy hóa đơn";

			this.formGroup.get('BuyerName').disable();
			this.formGroup.get('BuyerUnitName').disable();
			this.formGroup.get('BuyerAddress').disable();
			this.formGroup.get('BuyerTaxCode').disable();
			this.formGroup.get('ReceiverMobile').disable();
			this.formGroup.get('ReceiverEmail').disable();
			this.formGroup.get('ReceiveType').disable();
			this.formGroup.get('BuyerBankAccount').disable();

			//this.formGroup.get('BuyerTaxCode').clearValidators();
			this.formGroup.get('UserDefine').clearValidators();
		}
		else {
			if (this.item.UserDefine == null || this.item.UserDefine == '') {
				if (this.formGroup.get("TypeCreateInvoice").value == 'TypeCreateInvoice3')
					this.formGroup.get('UserDefine').setValidators(Validators.required);
				else
					this.formGroup.get('UserDefine').clearValidators();
			}

			this.formGroup.get('BuyerName').enable();
			this.formGroup.get('BuyerUnitName').enable();
			this.formGroup.get('BuyerAddress').enable();
			this.formGroup.get('BuyerTaxCode').enable();
			this.formGroup.get('ReceiverMobile').enable();
			this.formGroup.get('ReceiverEmail').enable();
			this.formGroup.get('ReceiveType').enable();
			this.formGroup.get('BuyerBankAccount').enable();

			// if (!this.formGroup.get('BuyerTaxCode').value)
			//   this.formGroup.get('BuyerTaxCode').setValidators(Validators.required);


		}

		this.item.TypeCreateInvoice = this.formGroup.get("TypeCreateInvoice").value

		this.formGroup.patchValue(this.item);
		this.saveChange();
	}

	//related ar invoices

	showSearchRelatedARs = false;
	relatedARs = [];
	selectedRelatedARs = [];
	curRelatedARsPageIndex = 0;
	showLoadMoreRelatedARs = true;
	searchRelatedARs_Id = 0;
	searchRelatedARs_IdSO = 0;
	searchRelatedARs_Date = '';
	searchRelatedARs_BuyerName = '';
	loadRelatedARs(pageIndex) {
		let skip = pageIndex * 50;
		let take = (pageIndex + 1) * 50;

		let searchTerm: any;

		if (this.searchRelatedARs_Id != 0 && this.searchRelatedARs_BuyerName != '' && this.searchRelatedARs_Date != '' && this.searchRelatedARs_IdSO != 0)
			searchTerm = { IsDeleted: false, IDParent: this.id, Id: this.searchRelatedARs_Id, CustomerName: this.searchRelatedARs_BuyerName, IDSaleOrder: this.searchRelatedARs_IdSO, InvoiceDate: this.searchRelatedARs_Date, Skip: skip, Take: take };
		else if (this.searchRelatedARs_Id != 0 && this.searchRelatedARs_BuyerName != '' && this.searchRelatedARs_Date == '' && this.searchRelatedARs_IdSO != 0)
			searchTerm = { IsDeleted: false, IDParent: this.id, Id: this.searchRelatedARs_Id, CustomerName: this.searchRelatedARs_BuyerName, IDSaleOrder: this.searchRelatedARs_IdSO, Skip: skip, Take: take };
		else if (this.searchRelatedARs_Id == 0 && this.searchRelatedARs_BuyerName != '' && this.searchRelatedARs_Date != '' && this.searchRelatedARs_IdSO != 0)
			searchTerm = { IsDeleted: false, IDParent: this.id, InvoiceDate: this.searchRelatedARs_Date, CustomerName: this.searchRelatedARs_BuyerName, IDSaleOrder: this.searchRelatedARs_IdSO, Skip: skip, Take: take };
		else if (this.searchRelatedARs_Id != 0 && this.searchRelatedARs_BuyerName == '' && this.searchRelatedARs_Date != '' && this.searchRelatedARs_IdSO != 0)
			searchTerm = { IsDeleted: false, IDParent: this.id, Id: this.searchRelatedARs_Id, InvoiceDate: this.searchRelatedARs_Date, IDSaleOrder: this.searchRelatedARs_IdSO, Skip: skip, Take: take };
		else if (this.searchRelatedARs_Id != 0 && this.searchRelatedARs_BuyerName != '' && this.searchRelatedARs_Date != '' && this.searchRelatedARs_IdSO == 0)
			searchTerm = { IsDeleted: false, IDParent: this.id, Id: this.searchRelatedARs_Id, CustomerName: this.searchRelatedARs_BuyerName, InvoiceDate: this.searchRelatedARs_Date, Skip: skip, Take: take };
		else if (this.searchRelatedARs_Id != 0 && this.searchRelatedARs_BuyerName != '' && this.searchRelatedARs_Date == '' && this.searchRelatedARs_IdSO == 0)
			searchTerm = { IsDeleted: false, IDParent: this.id, Id: this.searchRelatedARs_Id, CustomerName: this.searchRelatedARs_BuyerName, Skip: skip, Take: take };
		else if (this.searchRelatedARs_Id == 0 && this.searchRelatedARs_BuyerName != '' && this.searchRelatedARs_Date == '' && this.searchRelatedARs_IdSO != 0)
			searchTerm = { IsDeleted: false, IDParent: this.id, Id: this.searchRelatedARs_Id, IDSaleOrder: this.searchRelatedARs_IdSO, Skip: skip, Take: take };
		else if (this.searchRelatedARs_Id != 0 && this.searchRelatedARs_BuyerName == '' && this.searchRelatedARs_Date != '' && this.searchRelatedARs_IdSO == 0)
			searchTerm = { IsDeleted: false, IDParent: this.id, Id: this.searchRelatedARs_Id, InvoiceDate: this.searchRelatedARs_Date, Skip: skip, Take: take };
		else if (this.searchRelatedARs_Id == 0 && this.searchRelatedARs_BuyerName == '' && this.searchRelatedARs_Date != '' && this.searchRelatedARs_IdSO != 0)
			searchTerm = { IsDeleted: false, IDParent: this.id, IDSaleOrder: this.searchRelatedARs_IdSO, InvoiceDate: this.searchRelatedARs_Date, Skip: skip, Take: take };
		else if (this.searchRelatedARs_Id != 0 && this.searchRelatedARs_BuyerName == '' && this.searchRelatedARs_Date == '' && this.searchRelatedARs_IdSO == 0)
			searchTerm = { IsDeleted: false, IDParent: this.id, Id: this.searchRelatedARs_Id, Skip: skip, Take: take };
		else if (this.searchRelatedARs_Id == 0 && this.searchRelatedARs_BuyerName != '' && this.searchRelatedARs_Date == '' && this.searchRelatedARs_IdSO == 0)
			searchTerm = { IsDeleted: false, IDParent: this.id, CustomerName: this.searchRelatedARs_BuyerName, Skip: skip, Take: take };
		else if (this.searchRelatedARs_Id == 0 && this.searchRelatedARs_BuyerName == '' && this.searchRelatedARs_Date != '' && this.searchRelatedARs_IdSO == 0)
			searchTerm = { IsDeleted: false, IDParent: this.id, InvoiceDate: this.searchRelatedARs_Date, Skip: skip, Take: take };
		else if (this.searchRelatedARs_Id == 0 && this.searchRelatedARs_BuyerName == '' && this.searchRelatedARs_Date == '' && this.searchRelatedARs_IdSO != 0)
			searchTerm = { IsDeleted: false, IDParent: this.id, IDSaleOrder: this.searchRelatedARs_IdSO, Skip: skip, Take: take };
		else
			searchTerm = { IsDeleted: false, IDParent: this.id, Skip: skip, Take: take };

		this.pageProvider.search(searchTerm).toPromise().then((result: any) => {
			if (result) {
				this.showLoadMoreRelatedARs = result.length < 50 ? false : true;

				for (let index = 0; index < result.length; index++) {
					const ar = result[index];
					ar.InvoiceDateText = lib.dateFormat(ar.InvoiceDate, 'dd/mm/yyyy');
					ar._Status = this.statusList.find(d => d.Code == ar.Status);
					ar.TotalText = lib.currencyFormat(ar.TotalAfterTax);
					ar.checked = false;

					if (!this.relatedARs.find(f => f.Id == ar.Id)) {
						this.relatedARs.push(ar);
					}
				}
			}
		})
	}

	loadMoreRelatedARs() {
		this.curRelatedARsPageIndex += 1;
		this.loadRelatedARs(this.curRelatedARsPageIndex);
	}

	reInitRelatedARs() {
		this.relatedARs = [];
		this.curRelatedARsPageIndex = 0;
		this.loadRelatedARs(0);
	}

	isAllChecked = false;
	toggleSelectAll() {
		this.relatedARs.forEach(i => {
			i.checked = this.isAllChecked
			this.selectedRelatedARs.push(i);
		});
	}
	changeSelectionRelatedAR(i) {
		i.checked = !i.checked

		if (i.checked) {
			this.selectedRelatedARs.push(i);
		}
		else {
			let index = this.selectedRelatedARs.findIndex(d => d.Id == i.Id)
			this.selectedRelatedARs.splice(index, 1);
		}
	}

	removeRelatedAR(i) {
		this.selectedRelatedARs = [i];
		this.removeSelectedARs();
	}

	removeSelectedARs() {

		if (this.selectedRelatedARs.length > 0) {
			this.alertCtrl.create({
				header: 'Gỡ bỏ (' + this.selectedRelatedARs.length + ') hóa đơn đã chọn',
				//subHeader: '---',
				message: 'Bạn có chắc muốn gở bỏ các hóa đơn này khỏi hóa đơn gộp không? (Thao tác này không thể khôi phục, các hóa đơn gở bỏ sẽ được chuyển về trạng thái đã duyệt)',
				buttons: [
					{
						text: 'Không',
						role: 'cancel',
						handler: () => {
						}
					},
					{
						text: 'Đồng ý',
						cssClass: 'success-btn',
						handler: () => {
							let ids = this.selectedRelatedARs.map(m => m.Id);

							this.EInvoiceService.RollbackMergedARInvoice({ Ids: ids })
								.then((resp: any) => {
									if (resp == 'empty') {
										this.env.showTranslateMessage('Không tìn thấy thông tin hóa đơn cần gở bỏ. Vui lòng kiểm tra lại.', 'warning');
									}
									else if (resp == 'parent_empty') {
										this.env.showTranslateMessage('Không tìn thấy thông tin hóa đơn gộp để thực hiện việc gỡ bỏ hóa đơn. Vui lòng kiểm tra lại.', 'warning');
									}
									else if (resp == '') {
										this.env.showTranslateMessage('Đã gỡ bỏ hóa đơn thành công!', 'success');
									}
									else {
										this.env.showTranslateMessage(resp + 'Xin vui lòng thông báo với quản trị viên!', 'danger');
									}

									this.submitAttempt = false;
									this.reInitRelatedARs();
									this.refresh();
									this.isAllChecked = false;
								})

						}
					}
				]
			}).then(alert => {
				alert.present();
			})
		}
	}

  sortToggle(field) {
    if (!this.sort[field]) {
        this.sort[field] = field
    } else if (this.sort[field] == field) {
        this.sort[field] = field + '_desc'
    }
    else {
        delete this.sort[field];
    }

    let sortTerms = this.sort;

    let s = Object.keys(sortTerms).reduce(function (res, v) {
        return res.concat(sortTerms[v]);
    }, []);

    if (s.length) {
        this.query.SortBy = '[' + s.join(',') + ']';
    }
    else {
        delete this.query.SortBy;
    }

    this.reInitRelatedARs();
}

async addContact() {
  const modal = await this.modalController.create({
      component: SaleOrderMobileAddContactModalPage,
      swipeToClose: true,
      cssClass: 'my-custom-class',
      componentProps: {
          'firstName': 'Douglas',
          'lastName': 'Adams',
          'middleInitial': 'N'
      }
  });
  await modal.present();
  const { data } = await modal.onWillDismiss();
  
  let newContact = data[0];
  let andApply = data[1];

  if (andApply) {
      this.changedIDAddress(newContact);
  }
}

changedIDAddress(i) {
  if (i) {
      this.contactSelected = i;
      this.item.IDContact = i.Id;
      this.item.IDAddress = i.Id;
      this.formGroup.controls.IDContact.setValue(i.Id);
      this.formGroup.controls.IDContact.markAsDirty();
      this.formGroup.controls.IDAddress.setValue(i.IDAddress);
      this.formGroup.controls.IDAddress.markAsDirty();
      if (this.contactListSelected.findIndex(d => d.Id == i.Id) == -1) {
          this.contactListSelected.push(i);
          this.contactSearch();
      }
      this.saveChange();
  }

}

}
