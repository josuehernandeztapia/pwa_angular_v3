import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject } from 'rxjs';
import { AppComponent } from './app.component';
import { MediaPermissionsService } from './services/media-permissions.service';
import { SwUpdateService } from './services/sw-update.service';
import * as designTokens from './styles/design-tokens';

const theme = designTokens.theme;

@Component({
  standalone: true,
  selector: 'app-dummy',
  template: '<p data-testid="dummy">Dummy</p>'
})
class DummyComponent {}

class MediaPermissionsStub {
  isSupported(): boolean {
    return true;
  }
}

class SwUpdateServiceStub {
  updateAvailable$ = new BehaviorSubject<boolean>(false);
}

describe('AppComponent', () => {
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        RouterTestingModule.withRoutes([
          { path: '', component: DummyComponent },
          { path: 'dashboard', component: DummyComponent }
        ]),
        DummyComponent
      ],
      providers: [
        { provide: MediaPermissionsService, useClass: MediaPermissionsStub },
        { provide: SwUpdateService, useClass: SwUpdateServiceStub }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('should create the app and initialize dark mode', () => {
    const initSpy = spyOn(theme, 'initFromStorage');
    spyOn(theme, 'isDark').and.returnValue(false);

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    (expect(fixture.componentInstance) as any).toBeTruthy();
    (expect(initSpy) as any).toHaveBeenCalled();
    (expect(fixture.componentInstance.isDarkMode) as any).toBe(false);
  });

  it('should toggle dark mode using design tokens API', () => {
    spyOn(theme, 'initFromStorage');
    spyOn(theme, 'setDark');
    const toggleSpy = spyOn(theme, 'toggle');
    spyOn(theme, 'isDark').and.returnValues(false, true);

    const fixture = TestBed.createComponent(AppComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.toggleDarkMode();

    (expect(toggleSpy) as any).toHaveBeenCalled();
    (expect(component.isDarkMode) as any).toBe(true);
  });

  it('should allow explicit dark mode setting', () => {
    spyOn(theme, 'initFromStorage');
    const setDarkSpy = spyOn(theme, 'setDark');
    spyOn(theme, 'isDark').and.returnValue(false);

    const fixture = TestBed.createComponent(AppComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.setDarkMode(true);

    (expect(setDarkSpy) as any).toHaveBeenCalledWith(true);
    (expect(component.isDarkMode) as any).toBe(true);
  });

  it('should render accessibility landmarks', () => {
    spyOn(theme, 'initFromStorage');
    spyOn(theme, 'isDark').and.returnValue(false);

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    (expect(compiled.querySelector('a.skip-link')) as any).toBeTruthy();
    (expect(compiled.querySelector('main[role="main"]')) as any).toBeTruthy();
    (expect(compiled.querySelector('aside nav')) as any).toBeTruthy();
  });

  it('should render router content inside router-outlet', fakeAsync(() => {
    spyOn(theme, 'initFromStorage');
    spyOn(theme, 'isDark').and.returnValue(false);

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    router.navigateByUrl('dashboard');
    tick();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    (expect(compiled.querySelector('[data-testid="dummy"]')?.textContent) as any).toContain('Dummy');
  }));
});
