import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { PageBase } from 'src/app/page-base';
import { ModalController, NavController, LoadingController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { CRM_ContactProvider, CRM_PartnerTaxInfoProvider, HRM_StaffProvider } from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormGroup, FormControl, FormArray } from '@angular/forms';
import { catchError, concat, distinctUntilChanged, of, Subject, switchMap, tap } from 'rxjs';

@Component({
  selector: 'app-ar-contact-modal',
  templateUrl: './ar-contact-modal.page.html',
  styleUrls: ['./ar-contact-modal.page.scss'],
})
export class ARContactModalPage extends PageBase {
  IsBtnNew = true;
  IsBtnApply = false;
  constructor(
    public pageProvider: CRM_ContactProvider,
    public staffProvider: HRM_StaffProvider,
    public taxInfoProvider : CRM_PartnerTaxInfoProvider ,
    public env: EnvService,
    public navCtrl: NavController,

    public modalController: ModalController,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
  ) {
    super();
    this.id = 0;

    this.pageConfig.isDetailPage = true;

    this.formGroup = formBuilder.group({
      Id: new FormControl({ value: '', disabled: true }),
      WorkPhone:[null, [Validators.required, Validators.pattern('[- +()0-9]{10,}')]],
      Name: ['', Validators.required],
      Code: [''],
      IDOwner: [''],
      IsPersonal: [true],
      Email: [''],
      CompanyName: [''],
      BillingAddress:[''],
      Remark:[''],
      Address: this.formBuilder.group({
        Id: [''],
        Phone1: [''],
        Contact: [''],
      }),
      TaxInfos: this.formBuilder.array([]),
      TaxCode:['']
    });
    this.addTaxInfo({});
    console.log(this.item);
    this.salemanDataSource.initSearch();
  }
  salemanDataSource = {
    searchProvider: this.staffProvider,
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
                Take: 20,
                Skip: 0,
                SkipMCP: true,
                Term: term ? term : this.item?.IDSeller,

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

  addTaxInfo(taxInfo){
    let groups = this.formGroup.get('TaxInfos') as FormArray;
    let group = this.formBuilder.group({
      Id:[taxInfo?.Id],
      TaxCode:[taxInfo?.TaxCode],
      CompanyName:[taxInfo?.CompanyName],
      Email:[taxInfo?.Email],
      WorkPhone:[taxInfo?.WorkPhone],
      BillingAddress:[taxInfo?.BillingAddress],
    })
    groups.push(group);
  }
  async saveChange() {
    if (this.formGroup.invalid) {
      return;
    }
    let WorkPhone = this.formGroup.controls.WorkPhone.value;
    let Name = this.formGroup.controls.Name.value;
    this.formGroup.controls.Name.markAsDirty();
    this.formGroup.controls.IsPersonal.markAsDirty();
    this.formGroup.controls.Address['controls'].Contact.patchValue(Name);
    this.formGroup.controls.Address['controls'].Phone1.patchValue(WorkPhone);
    this.formGroup.controls.Address['controls'].Phone1.markAsDirty();
    this.formGroup.controls.Address['controls'].Contact.markAsDirty();
    this.formGroup.controls.Address.markAsDirty();
    super.saveChange2();
  }

  Apply(apply = false) {
    if (apply) {
      this.item = {
        Address: this.item ['Address'],
        IDOwner: this.item ['IDOwner'],
        Code: this.item ['Code'],
        IDAddress: this.item ['Address'].Id,
        Id: this.item ['Id'],
        Name: this.item ['Name'],
      };
      this.modalController.dismiss(this.item);
    } else {
      this.modalController.dismiss();
    }
  }
  reset() {
    this.IsBtnApply = false;
    this.IsBtnNew = true;
    this.formGroup.reset();
  }

  checkPhoneNumber() {
    if (this.formGroup.controls.WorkPhone.valid) {
      // let groups = this.formGroup.get('TaxInfos') as FormArray;
      // groups.controls[0].get('WorkPhone').setValue(this.formGroup.controls.WorkPhone.value);
      this.pageProvider
        .search({
          WorkPhone_eq: this.formGroup.controls.WorkPhone.value,
          SkipMCP: true,
          SkipAddress: true,
        })
        .toPromise()
        .then((results: any) => {
          if (results.length == 0 && results.findIndex((e) => e.Id == this.id)) {
            this.formGroup.enable();
            this.formGroup.get('Id').setValue(0);
            this.formGroup.controls.WorkPhone.setErrors(null);
            this.formGroup.controls.Address['controls'].Phone1.setValue(this.formGroup.controls.WorkPhone.value);
            this.formGroup.controls.Address['controls'].Id.setValue(0);
            this.formGroup.controls.Name.setValue('');
            this.formGroup.controls.Code.setValue('');
          } else {
            this.env
            .showPrompt('Contact has been existed, do you want to load information?')
            .then((_) => {
              this.formGroup.patchValue(results[0]);
              this.formGroup.markAsPristine();
              this.formGroup.get('WorkPhone').markAsDirty();
              this.formGroup.disable();
              this.formGroup.get('WorkPhone').enable();
              if(results[0]?._Owner) this.salemanDataSource.selected=[results[0]?._Owner]
              this.salemanDataSource.initSearch();
              this.item = results[0];
            }).catch(err=>{
              this.formGroup.enable();
              this.formGroup.controls.WorkPhone.setValue('');
              this.formGroup.get('Id').setValue(0);
              // this.formGroup.controls.WorkPhone.setErrors({
              //   incorrect: true,
              // });
            });
          }
        });
    }
    else {
      this.formGroup.enable();
      this.formGroup.controls.WorkPhone.setValue('');
      this.formGroup.get('Id').setValue(0);
    }
  }
  onChangedTaxCode(event, form) {
    //'{"MaSoThue":"0314643146","TenChinhThuc":"CÔNG TY TNHH CÔNG NGHỆ CODE ART","DiaChiGiaoDichChinh":"53/44/21, Bùi Xương Trạch, Phường Long Trường, Thành phố Thủ Đức, Thành phố Hồ Chí Minh, Việt Nam","DiaChiGiaoDichPhu":"","TrangThaiHoatDong":"NNT Đang hoạt động (đã được cấp GCN ĐKT)","SoDienThoai":"","ChuDoanhNghiep":"","LastUpdate":"2022-02-15T00:00:00"}'
    let value = event.target.value;
    if (value.length > 9) {
      this.taxInfoProvider.commonService
        .connect('GET', 'CRM/Contact/SearchUnitInforByTaxCode', {
          TaxCode: value,
        })
        .toPromise()
        .then((result: any) => {
          if (result.TenChinhThuc) {
            form.controls.CompanyName.setValue(result.TenChinhThuc);
            form.controls.CompanyName.markAsDirty();

            form.controls.BillingAddress.setValue(result.DiaChiGiaoDichChinh);
            form.controls.BillingAddress.markAsDirty();
          }
        })
        .catch((err) => {
          this.env.showMessage('Mã số thuế không hợp lệ!', 'danger');
        });
    }
  }
}
