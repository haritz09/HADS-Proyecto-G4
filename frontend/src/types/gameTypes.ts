export interface Position {
    x: number;
    y: number;
}

export interface Building {
    id: string;
    name: string;
    position: Position;
    is_castle?: boolean;
    can_recruit?: boolean;
}

export interface Hero {
    id: string;
    position: Position;
    stats?: any;
    army?: any[];
}

export interface GameState {
    current_player: 'player' | 'ai';
    player: {
        heroes: Hero[];
        cities: any[];
        resources: any;
    };
    ai: {
        heroes: Hero[];
        cities: any[];
        resources: any;
    };
    map: any;
}

export interface Action {
    type: string;
    details: {
        [key: string]: any;
    };
}
