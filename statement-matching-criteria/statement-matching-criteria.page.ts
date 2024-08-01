import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { StatementMatchingCriteriaDetailPage } from '../statement-matching-criteria-detail/statement-matching-criteria-detail.page';
import { BANK_StatementMatchingCriteriaProvider } from 'src/app/services/static/services.service';

@Component({
  selector: 'app-statement-matching-criteria',
  templateUrl: 'statement-matching-criteria.page.html',
  styleUrls: ['statement-matching-criteria.page.scss'],
})
export class StatementMatchingCriteriaPage extends PageBase {
  itemsState: any = [];
  isAllRowOpened = true;

  constructor(
    public pageProvider: BANK_StatementMatchingCriteriaProvider,
    public modalController: ModalController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public navCtrl: NavController,
  ) {
    super();
    this.pageConfig.forceLoadData = true;
    this.query.Take = 5000;
    this.query.AllChildren = true;
    this.query.AllParent = true;
  }

  loadedData(event) {
    this.buildFlatTree(this.items, this.itemsState, this.isAllRowOpened).then((resp: any) => {
      this.itemsState = resp;
    });
    super.loadedData(event);
  }

  toggleRowAll() {
    this.isAllRowOpened = !this.isAllRowOpened;
    this.itemsState.forEach((i) => {
      i.showdetail = !this.isAllRowOpened;
      this.toggleRow(this.itemsState, i, true);
    });
  }

  async showModal(i) {
    const modal = await this.modalController.create({
      component: StatementMatchingCriteriaDetailPage,
      componentProps: {
        items: this.itemsState,
        item: i,
        id: i.Id,
      },
      cssClass: 'my-custom-class',
    });
    return await modal.present();
  }

  add() {
    let newItem = {
      Id: 0,
      IsDisabled: false,
    };
    this.showModal(newItem);
  }
}
