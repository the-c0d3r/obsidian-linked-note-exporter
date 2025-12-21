export class TFile {
    basename: string;
    extension: string;
    name: string;
    path: string;
    stat: any;
    vault: any;

    constructor() {
        this.basename = '';
        this.extension = '';
        this.name = '';
        this.path = '';
        this.stat = {};
        this.vault = {};
    }
}

export class TFolder {
    name: string;
    path: string;
    children: any[];

    constructor() {
        this.name = '';
        this.path = '';
        this.children = [];
    }
}

export const Notice = jest.fn();
export const Modal = jest.fn();
export const Plugin = class { };
export const PluginSettingTab = class { };
export const Setting = class { };
export const normalizePath = (path: string) => path;
