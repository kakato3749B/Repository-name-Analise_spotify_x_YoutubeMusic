import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';

import { CommonModule, isPlatformBrowser } from '@angular/common';

interface Kpi {
  label: string;
  value: string;
  trend: string;
  trendType: 'pos' | 'flat';
  accent: 'sp' | 'yt';
}

interface Bar {
  value: number | string;
  heightPct: number;
  nd?: boolean;
}

interface YearGroup {
  year: string;
  spotify: Bar;
  youtube: Bar;
}

interface ShareSegment {
  name: string;
  value: number;
  color: string;
  dash: number;
  offset: number;
}

interface PayoutItem {
  name: string;
  value: number;
  color: string;
  hi?: boolean;
  low?: boolean;
  widthPct: number;
}

interface PriceItem {
  name: string;
  note: string;
  price: string;
  accent: 'sp' | 'yt';
}

@Component({
  selector: 'app-dashboard-powerbi-streaming',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-powerbi-streaming.component.html',
  styleUrls: ['./dashboard-powerbi-streaming.component.scss'],
})
export class DashboardPowerbiStreamingComponent
  implements AfterViewInit, OnDestroy {

  @ViewChild('growthBars', { static: true })
  growthBarsRef!: ElementRef<HTMLElement>;

  @ViewChild('donutWrap', { static: true })
  donutWrapRef!: ElementRef<HTMLElement>;

  @ViewChild('payoutList', { static: true })
  payoutListRef!: ElementRef<HTMLElement>;

  readonly circumference = 2 * Math.PI * 80;

  kpis: Kpi[] = [
    {
      label: 'Spotify · assinantes Premium',
      value: '300M',
      trend: '▲ MAU +12% a/a',
      trendType: 'pos',
      accent: 'sp'
    },
    {
      label: 'YouTube Music+Premium · assinantes',
      value: '125M',
      trend: '● dado de mar. 2025',
      trendType: 'flat',
      accent: 'yt'
    },
    {
      label: 'Spotify · fatia de mercado',
      value: '31,4%',
      trend: '▲ líder global',
      trendType: 'pos',
      accent: 'sp'
    },
    {
      label: 'YouTube Music · fatia de mercado',
      value: '12,4%',
      trend: '● 4º lugar',
      trendType: 'flat',
      accent: 'yt'
    },
    {
      label: 'Spotify · receita anual (2025)',
      value: 'R$ 106,5 bilhões',
      trend: '▲ 89% vem do Premium',
      trendType: 'pos',
      accent: 'sp'
    },
    {
      label: 'YouTube · pago à indústria (2025)',
      value: 'R$ 44 bilhões',
      trend: '▲ CAGR 18,9% desde 2021',
      trendType: 'pos',
      accent: 'yt'
    }
  ];

  yearGroups: YearGroup[] = [
    {
      year: '2021',
      spotify: {
        value: 180,
        heightPct: 60
      },
      youtube: {
        value: 50,
        heightPct: 16.7
      }
    },
    {
      year: '2022',
      spotify: {
        value: 205,
        heightPct: 68.3
      },
      youtube: {
        value: 80,
        heightPct: 27
      }
    },
    {
      year: '2024',
      spotify: {
        value: 263,
        heightPct: 87.7
      },
      youtube: {
        value: 100,
        heightPct: 33.3
      }
    },
    {
      year: '2025',
      spotify: {
        value: 290,
        heightPct: 96.7
      },
      youtube: {
        value: 125,
        heightPct: 41.7
      }
    }
  ];

  priceItems: PriceItem[] = [
    {
      name: 'Spotify Individual',
      note: 'Reajustado fev/2026 · inclui lossless',
      price: 'R$23,90',
      accent: 'sp'
    },
    {
      name: 'YouTube Premium Individual',
      note: 'Reajustado abr/2026 · YouTube todo, não só música',
      price: 'R$26,90',
      accent: 'yt'
    }
  ];

  shareSegments: ShareSegment[] = [];
  payoutItems: PayoutItem[] = [];
  activeShareIndex: number | null = null;

  /*
   * Estados das animações
   */
  growthRevealed = false;
  shareRevealed = false;
  payoutRevealed = false;

  growthPinVisible = false;
  growthPinLeft = 0;

  donutPinVisible = false;

  payoutPinVisible = false;
  payoutPinTop = 0;

  private growthObserver?: IntersectionObserver;
  private shareObserver?: IntersectionObserver;
  private payoutObserver?: IntersectionObserver;

  private growthTimeout?: ReturnType<typeof setTimeout>;
  private donutTimeout?: ReturnType<typeof setTimeout>;
  private payoutTimeout?: ReturnType<typeof setTimeout>;

  private initialAnimationFrame?: number;
  private secondAnimationFrame?: number;

  private readonly shareDataRaw = [
    {
      name: 'Spotify',
      value: 31.7,
      color: '#1E9E5B'
    },
    {
      name: 'YouTube Music',
      value: 9.7,
      color: '#E2542D'
    },
    {
      name: 'Outros',
      value: 58.6,
      color: '#D3D3D3'
    }
  ];

  private readonly payoutRaw = [
    {
      name: 'Spotify',
      value: 0.020,
      color: '#1E9E5B',
      hi: true
    },
    {
      name: 'YouTube Music',
      value: 0.0015,
      color: '#E2542D',
      hi: true,
      low: true
    }
  ];

  constructor(
    @Inject(PLATFORM_ID)
    private platformId: Object,

    private zone: NgZone
  ) {

    /*
     * Calcula os segmentos da rosca
     */
    let cumulative = 0;

    this.shareSegments = this.shareDataRaw.map((d) => {

      const dash =
        (d.value / 100) * this.circumference;

      const offset =
        -(cumulative / 100) * this.circumference;

      cumulative += d.value;

      return {
        ...d,
        dash,
        offset
      };
    });

    /*
     * Calcula as larguras das barras de pagamento
     */
    const max = Math.max(
      ...this.payoutRaw.map((p) => p.value)
    );

    this.payoutItems = this.payoutRaw.map((p) => ({
      ...p,
      widthPct: (p.value / max) * 100
    }));
  }

  ngAfterViewInit(): void {

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    /*
     * IMPORTANTE:
     *
     * A primeira animação não depende do IntersectionObserver.
     *
     * Isso evita o problema de SSR/hidratação onde o observer
     * pode executar antes da primeira pintura visual.
     */
    this.initialAnimationFrame =
      requestAnimationFrame(() => {

        this.zone.run(() => {

          this.growthRevealed = true;
          this.shareRevealed = true;
          this.payoutRevealed = true;

        });

        /*
         * Segundo frame:
         * garante que o navegador tenha aplicado o estado inicial
         * antes de executar as transições.
         */
        this.secondAnimationFrame =
          requestAnimationFrame(() => {

            this.zone.run(() => {

              this.positionGrowthPin();

              this.donutPinVisible = true;

              this.positionPayoutPin();

            });

          });

      });

    /*
     * Observer continua existindo para garantir que,
     * caso o elemento seja recriado/alterado, ele volte a funcionar.
     */

    this.setupObservers();
  }

  private setupObservers(): void {

    /*
     * CRESCIMENTO
     */
    this.growthObserver =
      this.createObserver(
        this.growthBarsRef.nativeElement,
        () => {

          this.zone.run(() => {

            this.growthRevealed = true;

            this.clearGrowthTimeout();

            this.growthTimeout =
              setTimeout(() => {

                this.positionGrowthPin();

              }, 1050);

          });

        }
      );

    /*
     * ROSCA
     */
    this.shareObserver =
      this.createObserver(
        this.donutWrapRef.nativeElement,
        () => {

          this.zone.run(() => {

            this.shareRevealed = true;

            this.clearDonutTimeout();

            this.donutTimeout =
              setTimeout(() => {

                this.donutPinVisible = true;

              }, 950);

          });

        }
      );

    /*
     * PAGAMENTO
     */
    this.payoutObserver =
      this.createObserver(
        this.payoutListRef.nativeElement,
        () => {

          this.zone.run(() => {

            this.payoutRevealed = true;

            this.clearPayoutTimeout();

            this.payoutTimeout =
              setTimeout(() => {

                this.positionPayoutPin();

              }, 1150);

          });

        }
      );
  }

  private createObserver(
    element: Element,
    callback: () => void
  ): IntersectionObserver {

    const observer =
      new IntersectionObserver(
        (entries) => {

          for (const entry of entries) {

            if (entry.isIntersecting) {

              callback();

              observer.unobserve(element);

              break;
            }
          }

        },
        {
          threshold: 0.05,
          rootMargin: '0px 0px -5% 0px'
        }
      );

    observer.observe(element);

    return observer;
  }

  /*
   * POSICIONA O MARCADOR DO GRÁFICO DE CRESCIMENTO
   */
  private positionGrowthPin(): void {

    if (!this.growthBarsRef?.nativeElement) {
      return;
    }

    const grupos =
      this.growthBarsRef.nativeElement
        .querySelectorAll('.grupo-barras');

    const ultimoGrupo =
      grupos[grupos.length - 1] as HTMLElement | undefined;

    if (!ultimoGrupo) {
      return;
    }

    const rect =
      ultimoGrupo.getBoundingClientRect();

    const parentRect =
      this.growthBarsRef.nativeElement
        .getBoundingClientRect();

    this.growthPinLeft =
      rect.left -
      parentRect.left -
      10;

    this.growthPinVisible = true;
  }

  /*
   * POSICIONA O MARCADOR DO PAGAMENTO
   */
  private positionPayoutPin(): void {

    if (!this.payoutListRef?.nativeElement) {
      return;
    }

    const linhaMenor =
      this.payoutListRef.nativeElement
        .querySelector('[data-low]') as HTMLElement | null;

    if (!linhaMenor) {
      return;
    }

    const rowRect =
      linhaMenor.getBoundingClientRect();

    const listRect =
      this.payoutListRef.nativeElement
        .getBoundingClientRect();

    this.payoutPinTop =
      rowRect.top -
      listRect.top -
      34;

    this.payoutPinVisible = true;
  }

  /*
   * INTERAÇÃO COM A ROSCA
   */
  setActiveShare(index: number | null): void {

    this.activeShareIndex = index;
  }

  get donutCenterValue(): string {

    if (this.activeShareIndex === null) {
      return '100%';
    }

    return `${this.shareSegments[this.activeShareIndex].value}%`;
  }

  get donutCenterLabel(): string {

    if (this.activeShareIndex === null) {
      return 'mercado pago global';
    }

    return this.shareSegments[this.activeShareIndex].name;
  }

  /*
   * LIMPEZA
   */
  ngOnDestroy(): void {

    this.growthObserver?.disconnect();
    this.shareObserver?.disconnect();
    this.payoutObserver?.disconnect();

    this.clearGrowthTimeout();
    this.clearDonutTimeout();
    this.clearPayoutTimeout();

    if (this.initialAnimationFrame) {
      cancelAnimationFrame(this.initialAnimationFrame);
    }

    if (this.secondAnimationFrame) {
      cancelAnimationFrame(this.secondAnimationFrame);
    }
  }

  private clearGrowthTimeout(): void {

    if (this.growthTimeout) {
      clearTimeout(this.growthTimeout);
      this.growthTimeout = undefined;
    }
  }

  private clearDonutTimeout(): void {

    if (this.donutTimeout) {
      clearTimeout(this.donutTimeout);
      this.donutTimeout = undefined;
    }
  }

  private clearPayoutTimeout(): void {

    if (this.payoutTimeout) {
      clearTimeout(this.payoutTimeout);
      this.payoutTimeout = undefined;
    }
  }
}