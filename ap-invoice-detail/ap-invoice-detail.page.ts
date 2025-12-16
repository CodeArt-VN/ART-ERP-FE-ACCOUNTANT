import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { NavController, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute, NavigationExtras } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
	AC_APInvoiceDetailProvider,
	AC_APInvoiceProvider,
	BRA_BranchProvider,
	HRM_StaffProvider,
	PURCHASE_OrderProvider,
	WMS_ItemProvider,
	WMS_ReceiptProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray, FormGroup } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';

@Component({
	selector: 'app-ap-invoice-detail',
	templateUrl: './ap-invoice-detail.page.html',
	styleUrls: ['./ap-invoice-detail.page.scss'],
	standalone: false,
})
export class APInvoiceDetailPage extends PageBase {
	statusList = [];
	branchList = [];
	paymentDetailList = [];
	paymentStatusList;
	paymentTypeList;
	paymentSubTypeList;
	paymentReasonList;
	paymentFormGroup: FormGroup;
	constructor(
		public pageProvider: AC_APInvoiceProvider,
		public apInvoiceDetailProvider: AC_APInvoiceDetailProvider,
		public itemProvider: WMS_ItemProvider,
		public receiptProvider: WMS_ReceiptProvider,
		public purchaseOrderProvider: PURCHASE_OrderProvider,
		public branchProvider: BRA_BranchProvider,
		public staffProvider: HRM_StaffProvider,
		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,
		public alertCtrl: AlertController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController,
		public commonService: CommonService
	) {
		super();
		this.pageConfig.isDetailPage = true;

		this.formGroup = formBuilder.group({
			IDBranch: [this.env.selectedBranch],
			Id: new FormControl({ value: '', disabled: true }),
			Code: [''],
			Name: [''],
			Remark: [''],
			Sort: [''],
			IsDisabled: new FormControl({ value: '', disabled: true }),
			IsDeleted: new FormControl({ value: '', disabled: true }),
			CreatedBy: new FormControl({ value: '', disabled: true }),
			CreatedDate: new FormControl({ value: '', disabled: true }),
			ModifiedBy: new FormControl({ value: '', disabled: true }),
			ModifiedDate: new FormControl({ value: '', disabled: true }),
			////////
			IDPurchaseOrder: [''],
			IDReceipt: [''],
			IDSeller: [''],
			IDBuyer: [''],
			IDOwner: [this.env.user.StaffID],

			RefSO: [''],
			RefCode: [''],

			////////
			Type: [''],
			Status: ['Open'],
			PaymentStatus: new FormControl({ value: '', disabled: true }),

			InvoiceForm: [''],
			InvoiceSerial: [''],
			InvoiceNo: ['', Validators.required],
			InvoiceGUID: [''],
			InvoiceCode: [''],
			InvoiceURL: [''],
			InvoiceDate: ['', Validators.required],
			InvoiceSignedDate: [''],

			TotalBeforeDiscount: [''],
			TotalDiscount: [''],
			CalcTotalAfterDiscount: new FormControl({
				value: 0,
				disabled: true,
			}),
			Tax: [''],
			WithholdingTax: [0],
			CalcTotalAfterTax: new FormControl({ value: 0, disabled: true }),

			////////
			Paid: new FormControl({ value: 0, disabled: true }),
			CalcBalance: new FormControl({ value: 0, disabled: true }),
			InvoiceDetails: this.formBuilder.array([]),
			DueDate: [''],
			Currency: [''],
			ExchangeRate: [''],

			////////
			SellerName: [''],
			SellerTaxCode: [''],
			SellerUnitName: [''],
			SellerAddress: [''],
			SellerBankAccount: [''],
			SellerPhone: [''],
			SellerEmail: [''],

			////////
			BuyerName: [''],
			BuyerTaxCode: [''],
			BuyerAddress: [''],
			DeletedFields: [''],

			TrackingPurchaseOrder: [''],
			TrackingReceipt: [''],
			IsAllChecked: [],
		});

		this.paymentFormGroup = formBuilder.group({
			PaymentType: [''],
			PaymentSubType: [''],
			PaymentReason: [''],
		});
	}

	preLoadData(event?: any): void {
		Promise.all([
			this.env.getStatus('APInvoice'),
			this.env.getStatus('OutgoingPaymentStatus'),
			this.env.getType('PaymentType'),
			this.env.getType('OutgoingPaymentReasonType'),
		]).then((values) => {
			this.statusList = values[0];
			this.paymentStatusList = values[1];
			this.paymentTypeList = values[2].filter((d) => d.Code == 'Cash' || d.Code == 'Card' || d.Code == 'Transfer');
			if (values[3]) {
				this.paymentReasonList = values[3];
				if (values[3].length == 0)
					this.paymentReasonList = [
						{ Name: 'Payment of invoice', Code: 'PaymentOfInvoice' },
						{ Name: 'Payment of purchase order', Code: 'PaymentOfPO' },
					];
			}
			super.preLoadData();
		});
	}

	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		if (this.item.Id) {
			this.item.InvoiceDate = lib.dateFormat(this.item.InvoiceDate);
			this.item.InvoiceSignedDate = lib.dateFormat(this.item.InvoiceSignedDate);
		} else {
			this.item.IDOwner = this.env.user.StaffID;
			this.item._Owner = {
				Id: this.env.user.StaffID,
				FullName: this.env.user.FullName,
			};
			console.log(this.env.user);

			this.formGroup.controls['IDOwner'].markAsDirty();
		}
		super.loadedData(event, ignoredFromGroup);

		this.patchLinesValue();

		if (this.item._Receipt) {
			this.formGroup.get('TrackingReceipt').setValue({
				BuyerName: this.item._Receipt.StorerName,
				SellerName: this.item._Receipt.VendorName,
				IDBuyer: this.item._Receipt.IDStorer,
				IDSeller: this.item._Receipt.IDVendor,
				Id: this.item._Receipt.Id,
				Code: this.item._Receipt.Code,
				Name: this.item._Receipt.Name,
			});
		}
		if (this.item._PurchaseOrder) {
			this.formGroup.get('TrackingPurchaseOrder').setValue({
				BuyerName: this.item._PurchaseOrder.StorerName,
				SellerName: this.item._PurchaseOrder.VendorName,
				IDBuyer: this.item._PurchaseOrder.IDStorer,
				IDSeller: this.item._PurchaseOrder.IDVendor,
				Id: this.item._PurchaseOrder.Id,
				Code: this.item._PurchaseOrder.Code,
				Name: this.item._PurchaseOrder.Name,
			});
		}
		// if (this.item.IDBuyer) {
		//   this.formGroup.get('TrackingBuyer').setValue({
		//     Id: this.item.IDBuyer,
		//     Name: this.item.BuyerName,
		//     Address: this.item.BuyerAddress,
		//     TaxCode: this.item.BuyerTaxCode,
		//   });
		// }
		if (this.item._Receipt) {
			this.IDReceiptDataSource.selected = [...[], this.item._Receipt];
		}

		if (this.item._PurchaseOrder) {
			this.IDPurchaseOrderDataSource.selected = [...[], this.item._PurchaseOrder];
		}
		if (this.item._Owner) {
			this.IDOwnerDataSource.selected = [...[], this.item._Owner];
		}
		this.IDReceiptDataSource.initSearch();
		this.IDPurchaseOrderDataSource.initSearch();
		this.IDOwnerDataSource.initSearch();
		if (!this.formGroup.get('Id').value) {
			this.formGroup.get('Status').markAsDirty();
		}

		if (this.pageConfig.canRequestOutgoingPayment) this.pageConfig.ShowRequestOutgoingPayment = true;
		let notShowRequestOutgoingPaymentPaymentStatus = ['Unapproved', 'Paid'];
		let notShowRequestOutgoingPaymentAPStatus = ['Draft', 'Closed', 'Canceled'];
		if (
			notShowRequestOutgoingPaymentAPStatus.includes(this.formGroup.get('Status').value) ||
			notShowRequestOutgoingPaymentPaymentStatus.includes(this.formGroup.get('PaymentStatus').value)
		) {
			this.pageConfig.ShowRequestOutgoingPayment = false;
		}
	}

	private patchLinesValue() {
		this.formGroup.controls.InvoiceDetails = new FormArray([]);

		if (this.item.InvoiceDetails?.length) {
			for (let i of this.item.InvoiceDetails) {
				this.addLine(i);
			}
		}

		if (!this.pageConfig.canEdit) {
			this.formGroup.controls.InvoiceDetails.disable();
		}
	}

	private addLine(line, markAsDirty = false) {
		let groups = <FormArray>this.formGroup.controls.InvoiceDetails;

		let preLoadItems = this.item._Items;
		let selectedItem = preLoadItems?.find((d) => d.Id == line.IDItem);

		let group = this.formBuilder.group({
			_IDItemDataSource: this.buildSelectDataSource((term) => {
				return this.itemProvider
				.search({
					SortBy: ['Id_desc'],
					Take: 20,
					Skip: 0,
					Keyword: term,
					IDBranch: this.formGroup.get('IDBranch').value,
					IDVendor: this.formGroup.get('IDSeller').value,
				})
			}),
			
			
			// [
			// 	{
			// 		searchProvider: this.itemProvider,
			// 		loading: false,
			// 		input$: new Subject<string>(),
			// 		selected: preLoadItems,
			// 		items$: null,
			// 		that: this,
			// 		initSearch() {
			// 			this.loading = false;
			// 			this.items$ = concat(
			// 				of(this.selected),
			// 				this.input$.pipe(
			// 					distinctUntilChanged(),
			// 					tap(() => (this.loading = true)),
			// 					switchMap((term) =>
			// 						this.searchProvider
			// 							.search({
			// 								SortBy: ['Id_desc'],
			// 								Take: 20,
			// 								Skip: 0,
			// 								Term: term,
			// 								IDBranch: this.that.formGroup.get('IDBranch').value,
			// 								IDVendor: this.that.formGroup.get('IDSeller').value,
			// 							})
			// 							.pipe(
			// 								catchError(() => of([])), // empty list on error
			// 								tap(() => (this.loading = false))
			// 							)
			// 					)
			// 				)
			// 			);
			// 		},
			// 	},
			// ],

			_IDUoMDataSource: [selectedItem ? selectedItem.UoMs : ''],

			IDAPInvoice: [line?.IDARInvoice || this.formGroup.get('Id').value],
			IDItem: [line?.IDItem, Validators.required],
			Id: new FormControl({ value: line?.Id, disabled: true }),

			ItemType: [line?.ItemType],
			ItemName: [line?.ItemName],
			UnitName: [line?.UnitName],
			IDUoM: [line.IDUoM, Validators.required],
			Quantity: [line?.Quantity, Validators.required],
			UoMPrice: [line?.UoMPrice],
			IsPromotionItem: [line?.IsPromotionItem],

			CalcTotalBeforeDiscount: [line?.TotalBeforeDiscount],
			TotalDiscount: [line?.TotalDiscount],
			CalcTotalAfterDiscount: [line?.TotalAfterDiscount],

			CalcTax: [line?.CalcTax],
			TaxRate: [line?.TaxRate],

			TotalAfterTax: [line?.TotalAfterTax],
			UserDefineDetails: [line?.UserDefineDetails],
			Sort: [line?.Sort],
			IsChecked: [],
		});
		groups.push(group);
		group.get('_IDItemDataSource').value?.initSearch();

		if (markAsDirty) {
			group.get('IDAPInvoice').markAsDirty();
		}
		group.valueChanges.subscribe((changes) => {
			this.calcTotal();
		});
	}

	getPaymentHistory() {
		this.showSpinnerPayment = true;
		let queryPayment = {
			Id: this.formGroup.get('Id').value,
		};
		this.commonService
			.connect('GET', 'AC/APInvoice/GetPaymentHistory/', queryPayment)
			.toPromise()
			.then((result: any) => {
				this.paymentDetailList = result;
				this.paymentDetailList.forEach((i) => {
					i._Status = this.paymentStatusList.find((d) => d.Code == i.Status);
				});
				console.log(result);
			})
			.catch((err) => this.env.showMessage(err, 'danger'))
			.finally(() => {
				this.showSpinnerPayment = false;
			});
	}

	async saveChange() {
		super.saveChange2();
	}

	calcTotal() {
		let invoiceDetails = this.formGroup.controls.InvoiceDetails.getRawValue();
		let totalBeforeDiscount = invoiceDetails.map((x) => x.UoMPrice * x.Quantity).reduce((a, b) => +a + +b, 0);
		let totalDiscount = invoiceDetails.map((x) => x.TotalDiscount).reduce((a, b) => +a + +b, 0);
		let tax = invoiceDetails.map((x) => x.CalcTax).reduce((a, b) => +a + +b, 0);
		let calcTotalAfterDiscount = totalBeforeDiscount - totalDiscount;
		let calcTotalAfterTax = calcTotalAfterDiscount + tax - (this.formGroup.get('WithholdingTax').value ?? 0);
		this.formGroup.get('TotalBeforeDiscount').setValue(totalBeforeDiscount);
		this.formGroup.get('TotalDiscount').setValue(totalDiscount);
		this.formGroup.get('Tax').setValue(tax);
		this.formGroup.get('CalcTotalAfterDiscount').setValue(totalBeforeDiscount - totalDiscount);
		this.formGroup.get('CalcTotalAfterTax').setValue(calcTotalAfterTax);
		this.formGroup.get('CalcBalance').setValue(calcTotalAfterTax - (this.formGroup.get('Paid').value ?? 0));
	}
	
	IDReceiptDataSource =this.buildSelectDataSource((term) => {
		const query: any = {
			SortBy: ['Id_desc'],
			Take: 20,
			Skip: 0,
			Term: term,
		};
		const formGroup = this.formGroup;
		if (this.formGroup.get('IDSeller')?.value && this.formGroup.get('IDPurchaseOrder').value) query.IDVendor =this. formGroup.get('IDSeller').value;
		if (this.formGroup.get('IDBuyer')?.value && this.formGroup.get('IDPurchaseOrder').value) query.IDStorer =this. formGroup.get('IDBuyer').value;
		return this.receiptProvider.search(query);
	});
	
	
	// {
	// 	searchProvider: this.receiptProvider,
	// 	loading: false,
	// 	input$: new Subject<string>(),
	// 	selected: [],
	// 	items$: null,
	// 	that: this,
	// 	initSearch() {
	// 		this.loading = false;
	// 		this.items$ = concat(
	// 			of(this.selected), // emit selected items first
	// 			this.input$.pipe(
	// 				distinctUntilChanged(),
	// 				tap(() => (this.loading = true)),
	// 				switchMap((term: any) => {
	// 					const query: any = {
	// 						SortBy: ['Id_desc'],
	// 						Take: 20,
	// 						Skip: 0,
	// 						Term: term,
	// 					};
	// 					const formGroup = this.that.formGroup;
	// 					if (formGroup.get('IDSeller')?.value && formGroup.get('IDPurchaseOrder').value) query.IDVendor = formGroup.get('IDSeller').value;
	// 					if (formGroup.get('IDBuyer')?.value && formGroup.get('IDPurchaseOrder').value) query.IDStorer = formGroup.get('IDBuyer').value;
	// 					return this.searchProvider.search(query).pipe(
	// 						catchError(() => of([])), // emit an empty list on error
	// 						tap(() => (this.loading = false))
	// 					);
	// 				}),
	// 				tap(() => (this.loading = false)) // Ensure loading is turned off after completion
	// 			)
	// 		);
	// 	},
	// };

	copyFromSource(query) {
		this.pageProvider.commonService
			.connect('GET', 'AC/APInvoice/CopyFromSource', query)
			.toPromise()
			.then((rs: any) => {
				this.item = rs;
				this.env.showMessage('Saving completed!', 'success');
				this.loadedData();
				this.calcTotal();
				if (this.pageConfig.pageName) this.env.publishEvent({ Code: this.pageConfig.pageName });
			})
			.catch((err) => {
				this.env.showMessage('Cannot save, please try again', 'danger');
			});
	}
	sourceChange(e, type) {
		if (this.formGroup.get('Id').value > 0) {
			let groups = this.formGroup.controls.InvoiceDetails as FormArray;
			if (e) {
				let query = {
					Id: this.formGroup.get('Id').value,
					IsOverride: false,
					IDSource: e.Id,
					SourceType: type,
				};
				let isCallAPI = false;
				//từ chưa có data qua có 2 data
				if (this.formGroup.get('IDPurchaseOrder').value && this.formGroup.get('IDReceipt').value) {
					if (groups.controls.length > 0) {
						this.env
							.showPrompt('Do you want to delete all current invoice details?', null, 'You are attaching new PO/Receipt!', 'Yes', 'No')
							.then((_) => {
								isCallAPI = true;
								query.IsOverride = true;
								this.pageProvider.commonService
									.connect('GET', 'AC/APInvoice/CopyFromSource', query)
									.toPromise()
									.then((rs: any) => {
										this.item = rs;
										this.env.showMessage('Saving completed!', 'success');
										this.loadedData();
										this.calcTotal();
									})
									.catch((err) => {
										this.env.showMessage('Cannot save, please try again', 'danger');
									});
							})
							.catch(() => {
								query.IsOverride = false;
							})
							.finally(() => {
								this.copyFromSource(query);
							});
					} else {
						this.copyFromSource(query);
					}
				}
				//từ chưa có data qua có 1 data
				else {
					if (groups.controls.length > 0) {
						//Hiện tại có seller rồi và change seller đó thì bảng giá bị thay đổi nên clear hết
						if (e.IDVendor != this.formGroup.get('Tracking' + type).value?.IDSeller) {
							this.env
								.showPrompt('Are you sure to continue ?', null, 'Price list was changed, invoice details would be deleted!', 'Yes', 'No')
								.then((_) => {
									query.IsOverride = true;
									isCallAPI = true;
								})
								.catch(() => {
									isCallAPI = false;
									let trackingValue = this.formGroup.get('Tracking' + type).value;
									this.formGroup.get('IDBuyer').setValue(trackingValue.IDStorer);
									this.formGroup.get('IDSeller').setValue(trackingValue.IDVendor);
									this.formGroup.get('BuyerName').setValue(trackingValue.BuyerName);
									this.formGroup.get('SellerName').setValue(trackingValue.SellerName);
									this.formGroup.get('ID' + type).setValue(trackingValue.Id);
								})
								.finally(() => {
									if (isCallAPI) {
										this.copyFromSource(query);
									}
								});
						} else this.copyFromSource(query);
					} else this.copyFromSource(query);
				}
				// if (groups.controls.length > 0) {
				//   //Hiện tại có seller rồi và change seller đó thì bảng giá bị thay đổi nên clear hết
				//   if (
				//     this.formGroup.get('Tracking' + type).value &&
				//     e.IDVendor != this.formGroup.get('Tracking' + type).value?.IDSeller
				//   ) {
				//     this.env
				//       .showPrompt(
				//         'Price list was changed, invoice details would be deleted ?',
				//         null,
				//         'Are you sure to continue ?',
				//         'Yes',
				//         'No',
				//       )
				//       .then((_) => {
				//         query.IsOverride = true;
				//         isCallAPI = true;

				//         this.formGroup.get('Tracking' + type).setValue({
				//           Id: e.Id,
				//           IDSeller: e.IDVendor,
				//           SellerName: e._Vendor?.Name,
				//           IDBuyer: e.IDStorer,
				//           BuyerName: e._Storer?.Name,
				//         });
				//       })
				//       .catch(() => {
				//         isCallAPI = false;
				//         let trackingValue = this.formGroup.get('Tracking' + type).value;
				//         this.formGroup.get('IDBuyer').setValue(trackingValue.IDStorer);
				//         this.formGroup.get('IDSeller').setValue(trackingValue.IDVendor);
				//         this.formGroup.get('BuyerName').setValue(trackingValue.BuyerName);
				//         this.formGroup.get('SellerName').setValue(trackingValue.SellerName);
				//         this.formGroup.get('ID' + type).setValue(trackingValue.Id);
				//       })
				//       .finally(() => {
				//         if (isCallAPI) {
				//           this.pageProvider.commonService
				//             .connect('GET', 'AC/APInvoice/CopyFromSource', query)
				//             .toPromise()
				//             .then((rs: any) => {
				//               this.item = rs;
				//               this.env.showMessage('Saving completed!', 'success');
				//               this.loadedData();
				//               this.calcTotal();
				//             })
				//             .catch((err) => {
				//               this.env.showMessage('Cannot save, please try again', 'danger');
				//             });
				//         }
				//       });
				//   } else {
				//     this.pageProvider.commonService
				//       .connect('GET', 'AC/APInvoice/CopyFromSource', query)
				//       .toPromise()
				//       .then((rs: any) => {
				//         this.item = rs;
				//         this.env.showMessage('Saving completed!', 'success');
				//         this.loadedData();
				//         this.calcTotal();
				//       })
				//       .catch((err) => this.env.showMessage('Cannot save, please try again', 'danger'));
				//   }
				// }
			} else {
				//todo
				if (groups.controls.length > 0 && !this.formGroup.get('IDPurchaseOrder').value && !this.formGroup.get('IDReceipt').value) {
					this.env
						.showPrompt('Are you sure to continue ?', null, 'Price list was changed, invoice details would be deleted!', 'Yes', 'No')
						.then((_) => {
							this.formGroup.get('IDPurchaseOrder').setValue(null);
							this.formGroup.get('IDPurchaseOrder').markAsDirty();
							this.formGroup.get('IDReceipt').setValue(null);
							this.formGroup.get('IDReceipt').markAsDirty();
							this.formGroup.get('DeletedFields').setValue(groups.getRawValue().map((s) => s.Id));
							this.formGroup.get('DeletedFields').markAsDirty();
							this.saveChange();
						})
						.catch(() => {
							this.formGroup.get('ID' + type).setValue(this.formGroup.get('Tracking' + type).value?.Id);
						});
				} else this.saveChange();
			}
		} else {
			if (e) {
				if (e?.IDVendor) {
					this.formGroup.controls['IDSeller'].setValue(e.IDVendor);
					this.formGroup.controls['IDSeller'].markAsDirty();

					if (e?.IDStorer) {
						this.formGroup.controls['IDBuyer'].setValue(e.IDStorer);
						this.formGroup.controls['IDBuyer'].markAsDirty();
					}

					if (e?.StorerName) {
						this.formGroup.controls['BuyerName'].setValue(e.StorerName);
						this.formGroup.controls['BuyerName'].markAsDirty();
					}

					if (e?.VendorName) {
						this.formGroup.controls['SellerName'].setValue(e.VendorName);
						this.formGroup.controls['SellerName'].markAsDirty();
					}
					if (e?._PurchaseOrder) {
						this.formGroup.controls['IDPurchaseOrder'].setValue(e._PurchaseOrder.Id);
						this.formGroup.controls['IDPurchaseOrder'].markAsDirty();
						this.IDPurchaseOrderDataSource.selected = [...this.IDPurchaseOrderDataSource.selected, e._PurchaseOrder];
						this.IDPurchaseOrderDataSource.initSearch();
					}
				}
			} else {
				if (!this.formGroup.get('IDReceipt').value && !this.formGroup.get('IDPurchaseOrder').value) {
					this.formGroup.controls['IDSeller'].setValue(null);
					this.formGroup.controls['IDBuyer'].setValue(null);
					this.formGroup.controls['BuyerName'].setValue(null);
					this.formGroup.controls['SellerName'].setValue(null);
				}
			}
			this.saveChange();
		}
	}
	IDPurchaseOrderDataSource = this.buildSelectDataSource((term) => {
		const query: any = {
			SortBy: ['Id_desc'],
			Take: 20,
			Skip: 0,
			Term: term,
		};
		if (this.formGroup.get('IDSeller')?.value &&this. formGroup.get('IDReceipt').value) query.IDVendor = this.formGroup.get('IDSeller').value;
		if (this.formGroup.get('IDBuyer')?.value && this.formGroup.get('IDReceipt').value) query.IDStorer = this.formGroup.get('IDBuyer').value;

		return this.purchaseOrderProvider.search(query);
	});
	
	
	// {
	// 	searchProvider: this.purchaseOrderProvider,
	// 	loading: false,
	// 	input$: new Subject<string>(),
	// 	selected: [],
	// 	items$: null,
	// 	that: this,
	// 	initSearch() {
	// 		this.loading = false;
	// 		this.items$ = concat(
	// 			of(this.selected), // emit selected items first
	// 			this.input$.pipe(
	// 				distinctUntilChanged(),
	// 				tap(() => (this.loading = true)),
	// 				switchMap((term: any) => {
	// 					const query: any = {
	// 						SortBy: ['Id_desc'],
	// 						Take: 20,
	// 						Skip: 0,
	// 						Term: term,
	// 					};
	// 					const formGroup = this.that.formGroup;
	// 					if (formGroup.get('IDSeller')?.value && formGroup.get('IDReceipt').value) query.IDVendor = formGroup.get('IDSeller').value;
	// 					if (formGroup.get('IDBuyer')?.value && formGroup.get('IDReceipt').value) query.IDStorer = formGroup.get('IDBuyer').value;

	// 					return this.searchProvider.search(query).pipe(
	// 						catchError(() => of([])), // emit an empty list on error
	// 						tap(() => (this.loading = false))
	// 					);
	// 				}),
	// 				tap(() => (this.loading = false)) // Ensure loading is turned off after completion
	// 			)
	// 		);
	// 	},
	// };
	
	IDOwnerDataSource = this.buildSelectDataSource((term) => {
		return this.staffProvider.search({ Take: 20, Skip: 0, Term: term });
	});
	
	
	// {
	// 	searchProvider: this.staffProvider,
	// 	loading: false,
	// 	input$: new Subject<string>(),
	// 	selected: [],
	// 	items$: null,
	// 	initSearch() {
	// 		this.loading = false;
	// 		this.items$ = concat(
	// 			of(this.selected),
	// 			this.input$.pipe(
	// 				distinctUntilChanged(),
	// 				tap(() => (this.loading = true)),
	// 				switchMap((term) =>
	// 					this.searchProvider.search({ Take: 20, Skip: 0, Term: term }).pipe(
	// 						catchError(() => of([])), // empty list on error
	// 						tap(() => (this.loading = false))
	// 					)
	// 				)
	// 			)
	// 		);
	// 	},
	// };

	IDItemChange(e, group) {
		if (e) {
			if (e.PurchaseTaxInPercent && e.PurchaseTaxInPercent != -99) {
				group.controls._IDUoMDataSource.setValue(e.UoMs);

				group.controls.IDUoM.setValue(e.PurchasingUoM);
				group.controls.IDUoM.markAsDirty();

				group.controls.TaxRate.setValue(e.PurchaseTaxInPercent);
				group.controls.TaxRate.markAsDirty();

				this.IDUoMChange(group);
				return;
			}

			if (e.PurchaseTaxInPercent != -99) this.env.showMessage('The item has not been set tax');
		}

		group.controls.TaxRate.setValue(null);
		group.controls.TaxRate.markAsDirty();

		group.controls.IDUoM.setValue(null);
		group.controls.IDUoM.markAsDirty();

		group.controls.UoMPrice.setValue(null);
		group.controls.UoMPrice.markAsDirty();
	}

	IDUoMChange(group) {
		let idUoM = group.controls.IDUoM.value;

		if (idUoM) {
			let UoMs = group.controls._IDUoMDataSource.value;
			let u = UoMs.find((d) => d.Id == idUoM);
			if (u && u.PriceList) {
				let p = u.PriceList.find((d) => d.Type == 'PriceListForVendor');
				let taxRate = group.controls.TaxRate.value;
				if (p && taxRate != null) {
					let priceBeforeTax = null;

					if (taxRate < 0) taxRate = 0; //(-1 || -2) In case goods are not taxed

					if (p.IsTaxIncluded) {
						priceBeforeTax = p.Price / (1 + taxRate / 100);
					} else {
						priceBeforeTax = p.Price;
					}

					group.controls.UoMPrice.setValue(priceBeforeTax);
					group.controls.UoMPrice.markAsDirty();

					this.saveChange();
					return;
				}
			}
		}
		group.controls.UoMPrice.setValue(null);
		group.controls.UoMPrice.markAsDirty();
	}

	IsPromotionItemChange(group) {
		if (group.controls.IsPromotionItem.value == true) {
			group.controls.TotalDiscount.setValue(0);
			group.controls.TotalDiscount.markAsDirty();

			group.controls.UoMPrice.setValue(0);
			group.controls.UoMPrice.markAsDirty();
			this.saveChange();
		} else {
			this.IDUoMChange(group);
		}
	}
	UoMPriceChange(group) {
		if (!group.controls.UoMPrice.value) {
			group.controls.UoMPrice.setValue(0);
		}
		this.saveChange();
	}
	TotalDiscountChange(group) {
		if (!group.controls.TotalDiscount.value) {
			group.controls.TotalDiscount.setValue(0);
		}
		this.saveChange();
	}

	removeLine(fg) {
		let groups = this.formGroup.controls.InvoiceDetails as FormArray;
		if (fg.controls.Id.value) {
			this.env.showPrompt({ code: 'Do you want to delete?' }).then((_) => {
				this.formGroup.get('DeletedFields').setValue([fg.controls.Id.value]);
				this.formGroup.get('DeletedFields').markAsDirty();
				this.saveChange().then((rs) => {
					let indexSelectedAll = this.selectedInvoiceDetails.getRawValue().findIndex((d) => d.Id == fg.get('Id').value);
					this.selectedInvoiceDetails.removeAt(indexSelectedAll);
					let index = groups.controls.findIndex((d) => d.get('Id').value == fg.get('Id').value);
					groups.removeAt(index);
				});
			});
		} else {
			let indexSelectedAll = this.selectedInvoiceDetails.getRawValue().findIndex((d) => d.Id == fg.get('Id').value);
			this.selectedInvoiceDetails.removeAt(indexSelectedAll);
			let index = groups.controls.findIndex((d) => d.get('Id').value == fg.get('Id').value);
			groups.removeAt(index);
		}
	}
	savedChange(savedItem = null, form = this.formGroup) {
		super.savedChange(savedItem, form);
		this.item = savedItem;
		this.loadedData();
	}

	selectedInvoiceDetails: any = new FormArray([]);
	changeSelection(i, e = null) {
		if (i.get('IsChecked').value) {
			this.selectedInvoiceDetails.push(i);
		} else {
			let index = this.selectedInvoiceDetails.getRawValue().findIndex((d) => d.Id == i.get('Id').value);
			this.selectedInvoiceDetails.removeAt(index);
		}
	}

	delete() {
		if (this.pageConfig.canEdit) {
			let itemsToDelete = this.selectedInvoiceDetails.getRawValue();
			this.env
				.showPrompt({ code: 'Bạn có chắc muốn xóa {{value}} đang chọn?', value: { value: itemsToDelete.length } }, null, {
					code: 'Xóa {{value1}} đang chọn?',
					value: { value1: itemsToDelete.length },
				})
				.then((_) => {
					this.formGroup.get('DeletedFields').setValue(itemsToDelete.map((i) => i.Id));
					this.formGroup.get('DeletedFields').markAsDirty();
					this.saveChange().then((rs) => {
						this.removeSelectedItems();
						this.env.showMessage('erp.app.app-component.page-bage.delete-complete', 'success');
						this.formGroup.get('IsAllChecked').setValue(false);
					});
				});
		}
	}

	removeSelectedItems() {
		let groups = <FormArray>this.formGroup.controls.InvoiceDetails;
		this.selectedInvoiceDetails.controls.forEach((fg) => {
			const indexToRemove = groups.controls.findIndex((control) => control.get('Id').value === fg.get('Id').value);
			groups.removeAt(indexToRemove);
		});

		this.selectedInvoiceDetails = new FormArray([]);
	}

	toggleSelectAll() {
		if (!this.pageConfig.canEdit) return;
		let groups = <FormArray>this.formGroup.controls.InvoiceDetails;
		if (!this.formGroup.get('IsAllChecked').value) {
			this.selectedInvoiceDetails = new FormArray([]);
		}
		groups.controls.forEach((i) => {
			i.get('IsChecked').setValue(this.formGroup.get('IsAllChecked').value);
			if (this.formGroup.get('IsAllChecked').value) this.selectedInvoiceDetails.push(i);
		});
	}
	showSpinnerPayment = false;
	segmentView = 's1';
	segmentChanged(ev: any) {
		this.segmentView = ev.detail.value;
		if (this.segmentView == 's3') {
			this.getPaymentHistory();
		}
	}

	ngOnDestroy() {
		this.dismissPopover();
	}
	@ViewChild('popover') popover;
	isOpenPopover = false;
	dismissPopover(apply: boolean = false) {
		if (apply) {
			if (!this.formGroup.get('IDSeller').value) {
				this.isOpenPopover = false;
				this.env.showMessage('Seller not valid!', 'danger');
				return;
			}
			let date = new Date(this.formGroup.get('InvoiceDate').value).toISOString().split('Z')[0];
			this.submitAttempt = true;
			let obj = {
				Id: 0,
				IDBusinessPartner: this.formGroup.get('IDSeller').value,
				IDBranch: this.formGroup.get('IDBranch').value,
				SourceType: 'Invoice',
				IDStaff: this.formGroup.get('IDOwner').value,
				Name: 'Pay for A/P invoices #' + this.formGroup.get('Id').value,
				Type: this.paymentFormGroup.get('PaymentType').value,
				SubType: this.paymentFormGroup.get('PaymentSubType').value,
				PaymentReason: this.paymentFormGroup.get('PaymentReason').value,
				PostingDate: date,
				DueDate: date,
				DocumentDate: date,
				OutgoingPaymentDetails: [this.formGroup.get('Id').value],
			};
			this.pageProvider.commonService
				.connect('POST', 'BANK/OutgoingPayment/PostFromSource', obj)
				.toPromise()
				.then((rs: any) => {
					this.env.showPrompt('Create outgoing payment successfully!', 'Do you want to navigate to outgoing payment ?').then(() => {
						this.nav('outgoing-payment/' + rs.Id, 'forward');
					});
					this.refresh();
				})
				.catch((err) => {
					this.env.showMessage(err.error?.Message ?? err, 'danger');
				})
				.finally(() => {
					this.submitAttempt = false;
					this.refresh();
				});
		}
		this.isOpenPopover = false;
	}
	presentPopover(event) {
		this.isOpenPopover = true;
	}
}
