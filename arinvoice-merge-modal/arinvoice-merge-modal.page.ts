import { Component, ChangeDetectorRef, Input } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { CRM_ContactProvider, AC_ARInvoiceProvider } from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray } from '@angular/forms';
import { NgSelectConfig } from '@ng-select/ng-select';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { lib } from 'src/app/services/static/global-functions';
import { ApiSetting } from 'src/app/services/static/api-setting';

@Component({
    selector: 'app-arinvoice-merge-modal',
    templateUrl: './arinvoice-merge-modal.page.html',
    styleUrls: ['./arinvoice-merge-modal.page.scss'],
    standalone: false
})
export class ARInvoiceMergeModalPage extends PageBase {
  @Input() selectedInvoices;

  initContactsIds = [];
  isMergeToEInvoice = false;
  isSubmitToEhoadon = false;
  newInvoiceDate = new Date();

  constructor(
    public pageProvider: AC_ARInvoiceProvider,
    public contactProvider: CRM_ContactProvider,

    public env: EnvService,
    public navCtrl: NavController,
    public route: ActivatedRoute,

    public modalController: ModalController,
    public alertCtrl: AlertController,
    public navParams: NavParams,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
    private config: NgSelectConfig,
  ) {
    super();
    this.pageConfig.isDetailPage = false;
    this.pageConfig.pageName = 'Gộp hóa đơn';
    this.config.notFoundText = 'Không tìm thấy dữ liệu phù hợp...';
    this.config.clearAllText = 'Xóa hết';
  }

  loadData(event) {
    this.item = {
      Ids: [],
      IDBusinessPartner: null,
      IDBranch: this.selectedInvoices[0].IDBranch,
      InvoiceDate: null,
      IDARInvoice: null,
    };
    if (this.selectedInvoices) {
      this.selectedInvoices.forEach((i) => {
        this.item.Ids.push(i.Id);
      });

      this.newInvoiceDate = new Date();
      this.item.InvoiceDate = this.newInvoiceDate;
      this.selectedInvoices.forEach((i) => {
        this.initContactsIds.push(i.IDBusinessPartner);
      });
    }
    this.loadedData(event);
  }

  loadedData(event) {
    this.initContactListSelected();

    this.pageProvider
      .read({
        Take: 20,
        Skip: 0,
        Status: 'EInvoiceNew',
        IsDeleted: false,
      })
      .then((ar: any) => {
        //this.arInvoiceSelected = ar.data[0];
        //this.item.IDBusinessPartner = this.contactSelected.Id;
        ar.data.forEach((a) => {
          if (a && this.arInvoiceListSelected.findIndex((d) => d.Id == a.Id) == -1) {
            this.arInvoiceListSelected.push({
              Id: a.Id,
              CustomerName: a.CustomerName,
              InvoiceNo: a.InvoiceNo,
              IDBusinessPartner: a.IDBusinessPartner,
              InvoiceDate: a.InvoiceDate,
            });
          }
        });
      })
      .finally(() => {
        this.arInvoiceSearch();
        this.cdr.detectChanges();
      });

    super.loadedData(event);
  }

  initContactListSelected() {
    if (this.initContactsIds.length) {
      this.contactProvider
        .read({ Id: JSON.stringify(this.initContactsIds) })
        .then((contacts: any) => {
          this.contactSelected = contacts.data[0];
          this.item.IDBusinessPartner = this.contactSelected.Id;
          contacts.data.forEach((contact) => {
            if (contact && this.contactListSelected.findIndex((d) => d.Id == contact.Id) == -1) {
              this.contactListSelected.push({
                Id: contact.Id,
                Code: contact.Code,
                Name: contact.Name,
                WorkPhone: contact.WorkPhone,
                AddressLine1: contact.AddressLine1,
              });
            }
          });
        })
        .finally(() => {
          this.contactSearch();
          this.cdr.detectChanges();
        });
    } else {
      this.contactSearch();
    }
  }

  contactList$;
  contactListLoading = false;
  contactListInput$ = new Subject<string>();
  contactListSelected = [];
  contactSelected = null;
  contactSearch() {
    console.log(this.item);

    this.contactListLoading = false;
    this.contactList$ = concat(
      of(this.contactListSelected),
      this.contactListInput$.pipe(
        distinctUntilChanged(),
        tap(() => (this.contactListLoading = true)),
        switchMap((term) =>
          this.contactProvider
            .search({
              Take: 20,
              Skip: 0,
              Term: term ? term : this.item.IDBusinessPartner,
            })
            .pipe(
              catchError(() => of([])), // empty list on error
              tap(() => (this.contactListLoading = false)),
            ),
        ),
      ),
    );
  }

  arInvoiceList$;
  arInvoiceListLoading = false;
  arInvoiceListInput$ = new Subject<string>();
  arInvoiceListSelected = [];
  arInvoiceSelected = null;
  arInvoiceSearch() {
    this.arInvoiceListLoading = false;
    this.arInvoiceList$ = concat(
      of(this.arInvoiceListSelected),
      this.arInvoiceListInput$.pipe(
        distinctUntilChanged(),
        tap(() => (this.arInvoiceListLoading = true)),
        switchMap((term) =>
          this.pageProvider
            .search({
              Take: 20,
              Skip: 0,
              Status: 'EInvoiceNew',
              InvoiceNo: term,
            })
            .pipe(
              catchError(() => of([])), // empty list on error
              tap(() => (this.arInvoiceListLoading = false)),
            ),
        ),
      ),
    );
  }

  mergeARInvoice() {
    let publishEventCode = this.pageConfig.pageName;
    let apiPath = {
      method: 'POST',
      url: function () {
        return ApiSetting.apiDomain('AC/ARInvoice/MergeARInvoice/');
      },
    };

    this.item.IsMergeToEInvoice = this.isMergeToEInvoice;
    this.item.IsSubmitToEhoadon = this.isSubmitToEhoadon;
    this.item.InvoiceDate = this.newInvoiceDate;
    this.item.Ids.push(this.item.IDARInvoice);

    return new Promise((resolve, reject) => {
      if (!this.item.Ids.length || !this.item.IDBusinessPartner) {
        this.env.showMessage('Please check the invoice to combine and select customer', 'warning');
      } else if (this.submitAttempt == false) {
        this.submitAttempt = true;

        if (!this.item.IDBranch) {
          this.item.IDBranch = this.env.selectedBranch;
        }
        this.pageProvider.commonService
          .connect(apiPath.method, apiPath.url(), this.item)
          .toPromise()
          .then((savedItem: any) => {
            if (publishEventCode) {
              this.env.publishEvent({ Code: publishEventCode });
            }
            this.env.showMessage('Saving completed!', 'success');
            resolve(savedItem.Id);
            this.submitAttempt = false;
            this.closeModal();
          })
          .catch((err) => {
            this.env.showMessage('Cannot save, please try again', 'danger');
            this.cdr.detectChanges();
            this.submitAttempt = false;
            reject(err);
          });
      }
    });
  }

  changedIDBusinessPartner(i) {
    if (i) {
      this.contactSelected = i;
      if (this.contactListSelected.findIndex((d) => d.Id == i.Id) == -1) {
        this.contactListSelected.push(i);
        this.contactSearch();
      }
    }
  }

  changedIDARInvoice(i) {
    if (i) {
      this.arInvoiceSelected = i;

      this.newInvoiceDate = this.arInvoiceSelected.InvoiceDate;
      this.item.IDARInvoice = this.arInvoiceSelected.Id;
      this.item.InvoiceDate = this.arInvoiceSelected.InvoiceDate;
      this.item.IDBusinessPartner = this.arInvoiceSelected.IDBusinessPartner;

      this.initContactsIds = [];
      this.contactList$ = null;
      this.contactListSelected = [];
      this.contactSelected = null;
      this.initContactsIds.push(this.arInvoiceSelected.IDBusinessPartner);

      this.arInvoiceSearch();
      this.initContactListSelected();
    }
  }

  changeMergeType(e: string) {
    this.initContactsIds = [];
    this.contactList$ = null;
    this.contactListSelected = [];
    this.contactSelected = null;

    this.selectedInvoices.forEach((i) => {
      this.initContactsIds.push(i.IDBusinessPartner);
    });

    this.item.IDARInvoice = null;
    this.item.IDBusinessPartner = null;

    if (e == 'normal') {
      this.isMergeToEInvoice = false;
      this.isSubmitToEhoadon = false;
    } else if (e == 'createEInvoice') {
      this.isMergeToEInvoice = false;
      this.isSubmitToEhoadon = true;
    } else {
      //mergeToExistedEInvoice
      this.isMergeToEInvoice = true;
      this.isSubmitToEhoadon = false;

      this.initContactsIds = [];
      if (this.arInvoiceSelected) {
        this.initContactsIds.push(this.arInvoiceSelected.IDBusinessPartner);
        this.changedIDARInvoice(this.arInvoiceSelected);
      }
    }

    this.initContactListSelected();
  }
}
