import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { DashboardStats, ActivityFeedItem, Market } from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private baseUrl = environment.api.baseUrl;
  
  // Real-time activity feed
  private activityFeedSubject = new BehaviorSubject<ActivityFeedItem[]>([]);
  public activityFeed$ = this.activityFeedSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeActivityFeed();
    this.simulateRealTimeActivity();
  }

  /**
   * Get dashboard statistics from backend
   */
  getDashboardStats(market?: Market): Observable<DashboardStats> {
    const params = market ? { market } : {};
    
    if (environment.features.enableMockData) {
      return of(this.getMockDashboardStats(market));
    }
    
    return this.http.get<DashboardStats>(`${this.baseUrl}/api/dashboard/stats`, { params });
  }

  /**
   * Get activity feed items
   */
  getActivityFeed(limit: number = 15): Observable<ActivityFeedItem[]> {
    if (environment.features.enableMockData) {
      return of(this.getMockActivityFeed().slice(0, limit));
    }
    
    return this.http.get<ActivityFeedItem[]>(`${this.baseUrl}/api/dashboard/activity`, {
      params: { limit: limit.toString() }
    });
  }

  /**
   * Add new activity to real-time feed
   */
  addActivity(activity: ActivityFeedItem): void {
    const currentFeed = this.activityFeedSubject.value;
    const updatedFeed = [activity, ...currentFeed].slice(0, 50); // Keep last 50
    this.activityFeedSubject.next(updatedFeed);
  }

  /**
   * Mock data for development
   */
  private getMockDashboardStats(market?: Market): DashboardStats {
    const baseStats: DashboardStats = {
      opportunitiesInPipeline: {
        nuevas: 12,
        expediente: 8,
        aprobado: 5
      },
      pendingActions: {
        clientsWithMissingDocs: 7,
        clientsWithGoalsReached: 3
      },
      activeContracts: 28,
      monthlyRevenue: {
        collected: 1250000,
        projected: 1800000
      }
    };

    // Adjust stats based on market filter
    if (market === 'aguascalientes') {
      return {
        ...baseStats,
        opportunitiesInPipeline: {
          nuevas: 8,
          expediente: 5,
          aprobado: 3
        },
        activeContracts: 18
      };
    }
    
    if (market === 'edomex') {
      return {
        ...baseStats,
        opportunitiesInPipeline: {
          nuevas: 4,
          expediente: 3,
          aprobado: 2
        },
        activeContracts: 10
      };
    }

    return baseStats;
  }

  /**
   * Mock activity feed for development
   */
  private getMockActivityFeed(): ActivityFeedItem[] {
    const now = new Date();
    return [
      {
        id: 'activity-1',
        type: 'payment_received',
        timestamp: new Date(now.getTime() - 5 * 60000), // 5 min ago
        message: 'Pago de enganche recibido',
        clientName: 'Carlos Mendoza',
        amount: 150000,
        icon: '💰'
      },
      {
        id: 'activity-2',
        type: 'doc_approved',
        timestamp: new Date(now.getTime() - 15 * 60000), // 15 min ago
        message: 'INE Aprobado por el sistema',
        clientName: 'María González',
        icon: '✅'
      },
      {
        id: 'activity-3',
        type: 'new_client',
        timestamp: new Date(now.getTime() - 30 * 60000), // 30 min ago
        message: 'Nuevo cliente registrado',
        clientName: 'Roberto Silva',
        icon: '👤'
      },
      {
        id: 'activity-4',
        type: 'goal_reached',
        timestamp: new Date(now.getTime() - 45 * 60000), // 45 min ago
        message: 'Meta de ahorro alcanzada',
        clientName: 'Ana Ruiz',
        amount: 200000,
        icon: '🎯'
      },
      {
        id: 'activity-5',
        type: 'contract_signed',
        timestamp: new Date(now.getTime() - 60 * 60000), // 1 hour ago
        message: 'Contrato firmado digitalmente',
        clientName: 'Luis Herrera',
        icon: '📝'
      }
    ];
  }

  /**
   * Initialize activity feed
   */
  private initializeActivityFeed(): void {
    this.getActivityFeed().subscribe(activities => {
      this.activityFeedSubject.next(activities);
    });
  }

  /**
   * Simulate real-time activity for demo
   */
  private simulateRealTimeActivity(): void {
    if (!environment.features.enableMockData) return;

    // Add new activity every 2-3 minutes
    setInterval(() => {
      const mockActivities = [
        {
          id: `activity-${Date.now()}`,
          type: 'payment_received' as const,
          timestamp: new Date(),
          message: 'Nuevo pago recibido',
          clientName: 'Cliente Demo',
          amount: Math.floor(Math.random() * 100000) + 50000,
          icon: '💰'
        },
        {
          id: `activity-${Date.now()}`,
          type: 'doc_approved' as const,
          timestamp: new Date(),
          message: 'Documento aprobado automáticamente',
          clientName: 'Cliente Demo',
          icon: '✅'
        }
      ];

      const randomActivity = mockActivities[Math.floor(Math.random() * mockActivities.length)];
      this.addActivity(randomActivity);
    }, 120000); // Every 2 minutes
  }
}