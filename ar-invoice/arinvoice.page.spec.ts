import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ARInvoicePage } from './ar-invoice.page';

describe('ARInvoicePage', () => {
	let component: ARInvoicePage;
	let fixture: ComponentFixture<ARInvoicePage>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			declarations: [ARInvoicePage],
			imports: [IonicModule.forRoot()],
		}).compileComponents();

		fixture = TestBed.createComponent(ARInvoicePage);
		component = fixture.componentInstance;
		fixture.detectChanges();
	}));

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
