import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StatementMatchingCriteriaPage } from './statement-matching-criteria.page';
import { ShareModule } from 'src/app/share.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ShareModule,
    RouterModule.forChild([{ path: '', component: StatementMatchingCriteriaPage }]),
  ],
  declarations: [StatementMatchingCriteriaPage],
})
export class StatementMatchingCriteriaPageModule {}
