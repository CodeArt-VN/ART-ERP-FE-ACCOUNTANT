import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { IncomingPaymentSaleOrderModalPage } from './incoming-payment-sale-order-modal.page';

describe('IncomingPaymentSaleOrderModalPage', () => {
	let component: IncomingPaymentSaleOrderModalPage;
	let fixture: ComponentFixture<IncomingPaymentSaleOrderModalPage>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [IncomingPaymentSaleOrderModalPage],
			schemas: [CUSTOM_ELEMENTS_SCHEMA],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(IncomingPaymentSaleOrderModalPage);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
