import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OutgoingPaymentSaleOrderModalPage } from './outgoing-payment-purchase-order-modal.page';

describe('OutgoingPaymentSaleOrderModalPage', () => {
  let component: OutgoingPaymentSaleOrderModalPage;
  let fixture: ComponentFixture<OutgoingPaymentSaleOrderModalPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [OutgoingPaymentSaleOrderModalPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OutgoingPaymentSaleOrderModalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
