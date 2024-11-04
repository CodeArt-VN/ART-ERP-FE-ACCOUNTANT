import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { PageBase } from 'src/app/page-base';
import { ModalController, NavController, LoadingController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { CRM_ContactProvider, HRM_StaffProvider } from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormGroup, FormControl } from '@angular/forms';
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
      WorkPhone: ['', Validators.required],
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
      TaxAddresses: [''],
      TaxCode:['']
    });
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
    return new Promise( (resolve, reject) => {
      this.formGroup.updateValueAndValidity();
      if (! this.formGroup.valid) {
        let invalidControls = this.findInvalidControlsRecursive(this.formGroup); 
        const translationPromises = invalidControls.map(control => this.env.translateResource(control));
        Promise.all(translationPromises).then((values) => {
          let invalidControls = values;
          this.env.showMessage('Please recheck control(s): {{value}}', 'warning', invalidControls.join(' | '));
          reject('form invalid');
          });
       
      } else if (this.submitAttempt == false) {
        this.submitAttempt = true;
        let submitItem = this.getDirtyValues(this.formGroup);

        this.pageProvider
          .save(submitItem, this.pageConfig.isForceCreate)
          .then((savedItem: any) => {
            resolve(savedItem);
            this.savedChange(savedItem,  this.formGroup);
          })
          .catch((err) => {
            this.env.showMessage('Cannot save, please try again', 'danger');
            this.cdr.detectChanges();
            this.submitAttempt = false;
            reject(err);
          });
      } else {
        reject('submitAttempt');
      }
    });
  
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
      this.pageProvider
        .search({
          WorkPhone_eq: this.formGroup.controls.WorkPhone.value,
          SkipMCP: true,
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
              this.formGroup.disable();
              this.formGroup.get('WorkPhone').enable();
              if(results[0]?._Owner) this.salemanDataSource.selected=[results[0]?._Owner]
              this.salemanDataSource.initSearch();
              this.item = results[0];
            }).catch(err=>{
              this.formGroup.enable();
              this.formGroup.controls.WorkPhone.setValue('');
              // this.formGroup.controls.WorkPhone.setErrors({
              //   incorrect: true,
              // });
            });
          }
        });
    }
    else this.formGroup.get('Id').setValue(0);
  }

}
