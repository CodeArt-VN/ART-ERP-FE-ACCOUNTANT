import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, LoadingController, AlertController, ModalController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { AC_ARInvoiceProvider, CRM_ContactProvider, WMS_ItemProvider } from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormGroup, FormArray } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { EInvoiceService } from 'src/app/services/einvoice.service';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { lib } from 'src/app/services/static/global-functions';
import { SaleOrderMobileAddContactModalPage } from '../../SALE/sale-order-mobile-add-contact-modal/sale-order-mobile-add-contact-modal.page';
import { ARContactModalPage } from './components/ar-contact-modal/ar-contact-modal.page';
import { ApiSetting } from 'src/app/services/static/api-setting';

@Component({
    selector: 'app-ar-invoice-detail',
    templateUrl: './ar-invoice-detail.page.html',
    styleUrls: ['./ar-invoice-detail.page.scss'],
    standalone: false
})
export class ARInvoiceDetailPage extends PageBase {
  statusList = [];
  ShowApprove = false;
  ShowCreateEInvoice = false;
  lockItemsStatus = [
    'EInvoiceRelease',
    'EInvoiceCancel',
    'ARInvoiceApproved',
    'ARInvoicePending',
    'ARInvoiceCanceled',
    'ARInvoiceSplited',
    'ARInvoiceMerged',
  ];
  lockHeaderStatus = [
    'EInvoiceRelease',
    'EInvoiceNew',
    'EInvoiceCancel',
    'EInvoiceEmpty',
    'ARInvoiceApproved',
    'ARInvoicePending',
    'ARInvoiceCanceled',
    'ARInvoiceSplited',
    'ARInvoiceMerged',
  ];
  lockAllStatus = ['EInvoiceRelease'];

  typeList = [];
  receiveTypeList = [];
  paymentMethodList = [];
  contentTypeList = [];
  isBindingTaxCode = false
  defaultOutputTax = null;
  isShowAddContactBtn = false;
  constructor(
    public pageProvider: AC_ARInvoiceProvider,
    public EInvoiceService: EInvoiceService,
    public contactProvider: CRM_ContactProvider,
    public itemProvider: WMS_ItemProvider,
    public env: EnvService,
    public navCtrl: NavController,
    public modalController: ModalController,
    public route: ActivatedRoute,
    public alertCtrl: AlertController,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
    public commonService: CommonService,
  ) {
    super();
    this.pageConfig.isDetailPage = true;

    this.formGroup = formBuilder.group({
      IDBranch: new FormControl({
        value: this.env.selectedBranch,
        disabled: false,
      }),
      Id: new FormControl({ value: '', disabled: true }),
      Code: new FormControl(),
      Name: new FormControl(),
      Remark: new FormControl(),
      CreatedBy: new FormControl({ value: '', disabled: true }),
      CreatedDate: new FormControl({ value: '', disabled: true }),
      ModifiedBy: new FormControl({ value: '', disabled: true }),
      ModifiedDate: new FormControl({ value: '', disabled: true }),

      IDBusinessPartner: ['', Validators.required],
      BuyerName: new FormControl(),
      ReceiveType: new FormControl({
        value: 'EInvoiceReceiveTypeEmailSMS',
        disabled: false,
      }),

      BuyerTaxCode: new FormControl(),
      BuyerUnitName: new FormControl(),
      BuyerAddress: new FormControl(),
      ReceiverMobile: new FormControl(),
      ReceiverEmail: new FormControl(
        '',
        Validators.compose([Validators.pattern('^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+.[a-zA-Z0-9-.]+$')]),
      ),

      Status: new FormControl({ value: 'ARInvoiceNew', disabled: true }),
      Type: new FormControl({ value: 'InvoiceTypeVAT', disabled: false }),
      TypeCreateInvoice: new FormControl({
        value: 'ItemList',
        disabled: false,
      }),
      PaymentMethod: new FormControl({
        value: 'InCash/WireTransfer',
        disabled: false,
      }),
      InvoiceDate: new FormControl({ value: '', disabled: false }),

      InvoiceForm: new FormControl({ value: '', disabled: true }),
      InvoiceSerial: new FormControl({ value: '', disabled: true }),

      InvoiceNo: new FormControl({ value: '', disabled: true }),
      InvoiceCode: new FormControl({ value: '', disabled: true }),
      InvoiceNote: new FormControl(),

      Lines: this.formBuilder.array([]),
      Contents: this.formBuilder.array([]),

      DeletedLines: [[]],
      DeletedContents: [[]],

      TotalAfterTax: new FormControl(),
    });
  }

  IDBusinessPartnerDataSource = {
    searchProvider: this.contactProvider,
    loading: false,
    input$: new Subject<string>(),
    selected: [],
    items$: null,
    initSearch() {
      this.loading = false;
      this.items$ = concat(
        of(this.selected),
        this.input$.pipe(
          distinctUntilChanged(),
          tap(() => (this.loading = true)),
          switchMap((term) =>
            this.searchProvider
              .search({
                SortBy: ['Id_desc'],
                Take: 20,
                Skip: 0,
                SkipMCP: true,
                SkipAddress: true,
                Term: term,
              })
              .pipe(
                catchError(() => of([])), // empty list on error
                tap(() => (this.loading = false)),
              ),
          ),
        ),
      );
    },
  };

  TaxCodeDataSource = [];
  LoadTaxCodeDataSource(i, markAsDirty = false) {
    this.TaxCodeDataSource = [];
    if (i?.TaxAddresses) {
      this.TaxCodeDataSource = i.TaxAddresses;
    }

    this.TaxCodeDataSource.push({
      TaxCode: '',
      CompanyName: 'Khách vãng lai',
      Email: '',
      BillingAddress: '',
      WorkPhone: '',
    });
    if (!this.item?.BuyerTaxCode) this.item.BuyerTaxCode = '';
    if (markAsDirty){
      let defaultTaxAddress = this.TaxCodeDataSource.find(d=> d.IsDefault);
      if(!defaultTaxAddress) defaultTaxAddress = this.TaxCodeDataSource[0];
      this.onBuyerTaxCodeChange(defaultTaxAddress,true);
    } 
  }

  onBuyerTaxCodeChange(event,forceSave = true) {
    this.formGroup.get('BuyerTaxCode').setValue(event.TaxCode);
    this.formGroup.get('BuyerUnitName').setValue(event.CompanyName);
    this.formGroup.get('BuyerAddress').setValue(event.BillingAddress);
    this.formGroup.get('ReceiverEmail').setValue(event.Email);
    this.formGroup.get('ReceiverMobile').setValue(event.BillingPhone || event.WorkPhone);

    this.formGroup.get('BuyerTaxCode').markAsDirty();
    this.formGroup.get('BuyerUnitName').markAsDirty();
    this.formGroup.get('BuyerAddress').markAsDirty();
    this.formGroup.get('ReceiverEmail').markAsDirty();
    this.formGroup.get('ReceiverMobile').markAsDirty();

    if(forceSave) this.saveChange();
  }

  IDBusinessPartnerChange(i) {
    //this.LoadTaxCodeDataSource(i);
    this.formGroup.get('BuyerName').setValue(i.IsPersonal ? i.Name : '');
    this.formGroup.get('BuyerName').markAsDirty();
    this.isBindingTaxCode = true;
    if(this.item?.DefaultBusinessPartner?.Id !=  i?.Id){
      this.isShowAddContactBtn = false;
    }
    this.saveChange();
  }

  TypeCreateInvoiceChange(i) {
    this.segmentView = i?.Code == 'DescriptionOfContent' ? 's4' : 's3';
    this.saveChange();
  }

  preLoadData(event?: any): void {
    Promise.all([
      this.env.getStatus('ARInvoiceStatus'),
      this.env.getType('InvoiceType'),
      this.env.getType('EInvoiceReceiveType'),
      this.env.getType('PaymentMethod'),
      this.env.getType('ARInvoiceListContentType'),

      // this.env.getStatus('EInvoiceStatus'),
      //
    ]).then((values: any) => {
      this.statusList = values[0];
      this.typeList = values[1];
      this.receiveTypeList = values[2];
      this.paymentMethodList = values[3];
      this.contentTypeList = values[4];

      // this.statusEInvoiceList = values[1];
      //

      super.preLoadData(event);
    });

    this.pageProvider.commonService
      .connect('GET', 'SYS/Config/ConfigByBranch', {
        Code: 'TaxOutput',
        IDBranch: this.env.selectedBranch,
      })
      .toPromise()
      .then((resp) => {
        this.defaultOutputTax = JSON.parse(resp['Value']);
        console.log(this.defaultOutputTax);
      })
      .catch((err) => {});
  }

  loadedData(event?: any, ignoredFromGroup?: boolean): void {
    if (this.item?.Id) {
      this.checkPermission();

      if (this.item?.InvoiceDate) {
        this.item.InvoiceDate = lib.dateFormat(this.item.InvoiceDate);
      }
      if (this.item?._BusinessPartner) {
        this.IDBusinessPartnerDataSource.selected.push(this.item?._BusinessPartner);
      }
     
    }
    if(this.item?.DefaultBusinessPartner?.Id ==  this.item.IDBusinessPartner){
      this.isShowAddContactBtn = true;
    }
    super.loadedData(event, ignoredFromGroup);
    this.LoadTaxCodeDataSource(this.item?._BusinessPartner,this.isBindingTaxCode);
    this.isBindingTaxCode = false;
    this.patchFormValue();
    this.IDBusinessPartnerDataSource.initSearch();
  }

  checkPermission() {
    if (this.item?.Status) {
      if (this.lockAllStatus.indexOf(this.item.Status) > -1) {
        this.pageConfig.canEdit = false;
        this.pageConfig.canDelete = false;
        //canCancelInvoice
        //canDisapproveInvoice
      }
    }
  }

  private patchFormValue() {
    if (!this.item.Id) {
      this.formGroup.get('IDBranch').markAsDirty();
      this.formGroup.get('Status').markAsDirty();
      this.formGroup.get('Type').markAsDirty();
      this.formGroup.get('TypeCreateInvoice').markAsDirty();
      this.formGroup.get('PaymentMethod').markAsDirty();
      this.formGroup.get('ReceiveType').markAsDirty();
    }
    //this.formGroup?.patchValue(this.item);
    this.patchLinesValue();
    this.patchContentsValue();
  }

  private patchLinesValue() {
    this.formGroup.controls.Lines = new FormArray([]);
    if (this.item.Lines?.length) {
      for (let i of this.item.Lines) {
        this.addLine(i);
      }
    }

    if (!this.pageConfig.canEdit || this.item.IDSaleOrder || this.item._HasChild) {
      this.formGroup.controls.Lines.disable();
    }
  }

  private addLine(line, markAsDirty = false) {
    let groups = <FormArray>this.formGroup.controls.Lines;

    let preLoadItems = this.item._Items;
    let selectedItem = preLoadItems.find((d) => d.Id == line.IDItem);

    let group = this.formBuilder.group({
      _IDItemDataSource: [
        {
          searchProvider: this.itemProvider,
          loading: false,
          input$: new Subject<string>(),
          selected: preLoadItems,
          items$: null,
          initSearch() {
            this.loading = false;
            this.items$ = concat(
              of(this.selected),
              this.input$.pipe(
                distinctUntilChanged(),
                tap(() => (this.loading = true)),
                switchMap((term) =>
                  this.searchProvider
                    .search({
                      ARSearch: true,
                      SortBy: ['Id_desc'],
                      Take: 20,
                      Skip: 0,
                      Term: term,
                    })
                    .pipe(
                      catchError(() => of([])), // empty list on error
                      tap(() => (this.loading = false)),
                    ),
                ),
              ),
            );
          },
        },
      ],

      _IDUoMDataSource: [selectedItem ? selectedItem.UoMs : ''],

      IDARInvoice: [line.IDARInvoice],
      IDItem: [line.IDItem, Validators.required],
      Id: new FormControl({ value: line.Id, disabled: true }),

      ItemType: [line.ItemType],
      ItemName: [line.ItemName],
      UnitName: [line.UnitName],
      IDUoM: [line.IDUoM, Validators.required],
      IDBaseUoM: [line.IDBaseUoM],
      UoMSwap: [line.UoMSwap],
      UoMSwapAlter: [line.UoMSwapAlter],
      Quantity: [line.Quantity, Validators.required],
      BaseQuantity: [line.BaseQuantity],
      UoMPrice: [line.UoMPrice],
      IsPromotionItem: [line.IsPromotionItem],

      IDTax: [line.IDTax],
      TaxRate: [line.TaxRate],

      TotalBeforeDiscount: [line.TotalBeforeDiscount],
      TotalDiscount: [line.TotalDiscount],
      TotalAfterDiscount: [line.TotalAfterDiscount],

      Tax: [line.Tax],
      TotalAfterTax: [line.TotalAfterTax],
      UserDefineDetails: [line.UserDefineDetails],
      Sort: [line.Sort],
      Remark: new FormControl({ value: line.Remark, disabled: true }),
    });
    groups.push(group);

    group.get('_IDItemDataSource').value?.initSearch();

    if (markAsDirty) {
      group.get('IDARInvoice').markAsDirty();
    }
  }

  addNewLine() {
    let newLine: any = {
      IDARInvoice: this.item.Id,
      Id: 0,
    };
    this.addLine(newLine, true);
  }

  removeLine(g, index) {}

  IDItemChange(e, group) {
    if (e) {
      if (e.SalesTaxInPercent && e.SalesTaxInPercent != -99) {
        group.controls._IDUoMDataSource.setValue(e.UoMs);

        group.controls.IDUoM.setValue(e.SalesUoM);
        group.controls.IDUoM.markAsDirty();

        group.controls.TaxRate.setValue(e.SalesTaxInPercent);
        group.controls.TaxRate.markAsDirty();

        this.IDUoMChange(group);
        return;
      }

      if (e.SalesTaxInPercent != -99) this.env.showMessage('The item has not been set tax');
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
        let paymentMethod = this.formGroup.controls.PaymentMethod.value;
        let p = u.PriceList.find(
          (d) => d.Type == (paymentMethod == 'GoodsReturn' ? 'PriceListForVendor' : 'PriceListForCustomer'),
        );
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

  private patchContentsValue() {
    this.formGroup.controls.Contents = new FormArray([]);
    this.item._ContentsTotal = 0.0;
    if (this.item.Contents?.length) {
      for (let i of this.item.Contents) {
        this.addContent(i);
        this.item._ContentsTotal += i.CalcTotalAfterTax;
      }
    }

    if (!this.pageConfig.canEdit) {
      this.formGroup.controls.Contents.disable();
    }
  }

  private addContent(line, markAsDirty = false) {
    let groups = <FormArray>this.formGroup.controls.Contents;
    let group = this.formBuilder.group({
      IDARInvoice: [line.IDARInvoice],
      Id: new FormControl({ value: line.Id, disabled: true }),
      ItemType: [line.ItemType],
      ItemName: [line.ItemName, Validators.required],
      UnitName: [line.UnitName],
      Quantity: [line.Quantity, Validators.required],
      UoMPrice: [line.UoMPrice, Validators.required],
      TaxRate: [line.TaxRate, Validators.required],

      IsPromotionItem: [line.IsPromotionItem],
      TotalDiscount: [line.TotalDiscount],
      Sort: [line.Sort],
    });
    groups.push(group);

    if (markAsDirty) {
      group.get('IDARInvoice').markAsDirty();
      group.get('Quantity').markAsDirty();
      group.get('TaxRate').markAsDirty();
      group.get('UoMPrice').markAsDirty();
    }
  }

  public addNewContent() {
    let newContent: any = {
      IDARInvoice: this.item.Id,
      Id: 0,
      Quantity: 1,
      TaxRate: this.defaultOutputTax ? this.defaultOutputTax.Rate : 10,
    };
    newContent.UoMPrice = (this.item.TotalAfterTax - this.item._ContentsTotal) / (1 + newContent.TaxRate / 100);
    if (newContent.UoMPrice < 0) {
      newContent.UoMPrice = '';
    }
    this.addContent(newContent, true);
  }

  removeContent(g, index) {
    this.env
      .showPrompt('Are you sure you want to delete this row(s)?')
      .then((_) => {
        let groups = <FormArray>this.formGroup.controls.Contents;
        groups.removeAt(index);
        this.item.Lines.splice(index, 1);
        let deletedLines = this.formGroup.get('DeletedContents').value;
        let deletedId = g.controls.Id.value;
        deletedLines.push(deletedId);

        this.formGroup.get('DeletedContents').setValue(deletedLines);
        this.formGroup.get('DeletedContents').markAsDirty();
        this.saveChange();
      })
      .catch((_) => {});
  }

  setOrderValue(data, instantly = false, forceSave = false) {
    for (const c in data) {
      if (c == 'Lines' || c == 'Lines') {
        let fa = <FormArray>this.formGroup.controls.Lines;

        for (const line of data[c]) {
          let idx = -1;
          if (c == 'Lines') {
            idx = this.item[c].findIndex((d) => d.Id == line.Id && d.IDUoM == line.IDUoM);
          }
          //Remove Order line
          if (line.Quantity < 1) {
            if (line.Id) {
              let deletedLines = this.formGroup.get('DeletedLines').value;
              deletedLines.push(line.Id);
              this.formGroup.get('DeletedLines').setValue(deletedLines);
              this.formGroup.get('DeletedLines').markAsDirty();
            }
            this.item.Lines.splice(idx, 1);
            fa.removeAt(idx);
          }
          //Update
          else {
            let cfg = <FormGroup>fa.controls[idx];

            for (const lc in line) {
              let fc = <FormControl>cfg.controls[lc];
              if (fc) {
                fc.setValue(line[lc]);
                fc.markAsDirty();
              }
            }
          }

          let numberOfGuests = this.formGroup.get('NumberOfGuests');
          numberOfGuests.setValue(this.item.Lines?.map((x) => x.Quantity).reduce((a, b) => +a + +b, 0));
          numberOfGuests.markAsDirty();
        }
      } else {
        let fc = <FormControl>this.formGroup.controls[c];
        if (fc) {
          fc.setValue(data[c]);
          fc.markAsDirty();
        }
      }
    }
    this.calcOrder();

    if ((this.item.Lines.length || this.formGroup.controls.DeletedLines.value.length) && this.pageConfig.IsAutoSave) {
      if (instantly) this.saveChange();
      else
        this.debounce(() => {
          this.saveChange();
        }, 1000);
    }
    if (forceSave) {
      this.saveChange();
    }
  }

  calcOrder() {}
  
  async addContact() {
    const modal = await this.modalController.create({
      component: ARContactModalPage,
      cssClass: 'modal90',
      componentProps: {
        firstName: 'Douglas',
        lastName: 'Adams',
        middleInitial: 'N',
      },
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if(data){
      this.IDBusinessPartnerDataSource.selected = [data];
      this.formGroup.get('IDBusinessPartner').setValue(data.Id);
      this.formGroup.get('IDBusinessPartner').markAsDirty();
      this.IDBusinessPartnerChange(data);
    }
  }
  
  approveInvoices() {
    if (!this.pageConfig.canApproveInvoice) {
      return;
    }
    this.alertCtrl
      .create({
        header: 'Duyệt hóa đơn',
        //subHeader: '---',
        message: 'Bạn có chắc muốn xác nhận dyệt hóa đơn đang chọn?',
        buttons: [
          {
            text: 'Không',
            role: 'cancel',
            handler: () => {
              //console.log('Không xóa');
            },
          },
          {
            text: 'Duyệt',
            cssClass: 'danger-btn',
            handler: () => {
              let publishEventCode = this.pageConfig.pageName;
              let apiPath = {
                method: 'POST',
                url: function () {
                  return ApiSetting.apiDomain('AC/ARInvoice/ApproveInvoices/');
                },
              };

              if (this.submitAttempt == false) {
                this.submitAttempt = true;

                let postDTO = { Ids: [] };
                postDTO.Ids = [this.formGroup.get('Id').value]

                this.pageProvider.commonService
                  .connect(apiPath.method, apiPath.url(), postDTO)
                  .toPromise()
                  .then((savedItem: any) => {
                    if (publishEventCode) {
                      this.env.publishEvent({
                        Code: publishEventCode,
                      });
                    }
                    this.loadedData();
                    this.env.showMessage('Saving completed!', 'success');
                    this.submitAttempt = false;
                  })
                  .catch((err) => {
                    this.submitAttempt = false;
                    //console.log(err);
                  });
              }
            },
          },
        ],
      })
      .then((alert) => {
        alert.present();
      });
  }

  createEInvoice() {
    if (!this.pageConfig.canCreateEInvoice) {
      return;
    }

    this.alertCtrl
    .create({
      header: 'Xuất hóa đơn điện tử',
      //subHeader: '---',
      message: 'Bạn có chắc muốn xuất hóa đơn điện tử cho các hóa đơn này?',
      buttons: [
        {
          text: 'Không',
          role: 'cancel',
          handler: () => {},
        },
        {
          text: 'Có',
          cssClass: 'success-btn',
          handler: () => {
            this.loadingController
              .create({
                cssClass: 'my-custom-class',
                message: 'Vui lòng chờ cấp số hóa đơn...',
              })
              .then((loading) => {
                loading.present();
                this.EInvoiceService.CreateEInvoice([this.formGroup.get('Id').value])
                  .toPromise()
                  .then((resp: any) => {
                    if (loading) loading.dismiss();
                    this.submitAttempt = false;

                    let errors = resp.filter((d) => d.Status == 1);
                    let message = '';

                    for (let i = 0; i < errors.length && i <= 5; i++)
                      if (i == 5) message += '<br> Còn nữa...';
                      else {
                        const e = errors[i];
                        message += '<br> #' + e.PartnerInvoiceID + ' lỗi: ' + e.MessLog;
                      }
                    if (message != '') {
                      this.env.showAlert(message,{code:'Có {{value}} hóa đơn lỗi, vui lòng kiểm tra lại ghi chú của các hóa đơn không được duyệt.',value:errors.length},'Xuất hóa đơn',
                      );
                      this.refresh();
                    } else {
                      this.env.showMessage('Đã xuất hóa đơn điện tử!', 'success');
                      this.submitAttempt = false;
                      this.refresh();
                    }
                  })
                  .catch((err: any) => {
                    this.env.showMessage(
                      'Không xuất hóa đơn được, xin vui lòng kiểm tra lại! \n' + err?.error?.ExceptionMessage,
                      'danger',
                    );
                    console.log(err);
                    this.submitAttempt = false;
                    if (loading) loading.dismiss();
                  });
              });
          },
        },
      ],
    })
    .then((alert) => {
      alert.present();
    });
  }


  segmentView = 's3';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
  }

  async saveChange() {
    super.saveChange2();
  }

  savedChange(savedItem?: any, form?: FormGroup<any>): void {
    super.savedChange(savedItem, form);
    this.item = savedItem;
    this.loadedData();
  }
}
