import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { lib } from 'src/app/services/static/global-functions';
import { BANK_StatementMatchingCriteriaProvider, BRA_BranchProvider } from 'src/app/services/static/services.service';

@Component({
  selector: 'app-statement-matching-criteria-detail',
  templateUrl: './statement-matching-criteria-detail.page.html',
  styleUrls: ['./statement-matching-criteria-detail.page.scss'],
})
export class StatementMatchingCriteriaDetailPage extends PageBase {
  branchList;

  constructor(
    public pageProvider: BANK_StatementMatchingCriteriaProvider,
    public branchProvider: BRA_BranchProvider,
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
    this.pageConfig.forceLoadData = true;
    this.pageConfig.isDetailPage = true;
    this.pageConfig.isForceCreate = true;
    this.id = this.route.snapshot.paramMap.get('id');
    this.formGroup = formBuilder.group({
      IDParent: [''],
      Id: new FormControl({ value: '', disabled: true }),
      IDBranch: [''],
      Code: ['', Validators.required],
      Name: ['', Validators.required],
      Type:[''],
      Remark: [''],
      Sort: [''],
    });
  }

  preLoadData() {
    if (this.navParams) {
      this.items = lib.cloneObject(this.navParams.data.items);
      this.items.forEach((i) => {
        let prefix = '';
        for (let j = 1; j < i.level; j++) {
          prefix += '- ';
        }
        i.Name = prefix + i.Name;
      });
      this.item = lib.cloneObject(this.navParams.data.item);
      this.id = this.navParams.data.id;

      this.removeCurrentNode();
      
      this.cdr.detectChanges();
      this.branchProvider
      .read({ Skip: 0, Take: 5000, AllParent: true, Id: this.env.selectedBranchAndChildren })
      .then((resp) => {
        lib
          .buildFlatTree(resp['data'], this.branchList)
          .then((result: any) => {
            this.branchList = result;
            this.branchList.forEach((i) => {
              if(i.Id != this.env.selectedBranch){
                i.disabled = true;
              }
            });
            this.markNestedNodeBranch(this.branchList, this.env.selectedBranch);
            this.loadedData();
          })
          .catch((err) => {
            this.env.showMessage(err);
          });
      });
      
    }
  }

  refresh() {
    this.preLoadData();
  }

  removeCurrentNode() {
    let currentItem = this.items.find((i) => i.Id == this.id);
    if (currentItem) {
      currentItem.Flag = true;
      this.markNestedNode(this.items, this.id);
    }
  }

  markNestedNode(ls, Id) {
    ls.filter((d) => d.IDParent == Id).forEach((i) => {
      i.Flag = true;
      this.markNestedNode(ls, i.Id);
    });
  }
  markNestedNodeBranch(ls, Id) {
    ls.filter((d) => d.IDParent == Id).forEach((i) => {
      if (i.Type != 'Warehouse' && i.Type != 'TitlePosition') i.disabled = false;
      this.markNestedNodeBranch(ls, i.Id);
    });
  }
  async saveChange(){
    this.saveChange2()
  }
}
