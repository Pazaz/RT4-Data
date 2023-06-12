import { KNOWN_HASHES, KNOWN_NAMES, hashCode } from '#rt4/enum/hashes.js';
import { readGroup } from '#rt4/util/OpenRS2.js';

class Js5Index {
    id = -1;
    version = 0;
    size = 0;
    capacity = 0;

    groupIds = [];
    groupVersions = [];
    groupChecksums = [];
    groupCapacities = [];
    groupSizes = [];
    groupNameHashes = [];
    groupNames = [];
    groupChecksums = [];
    groupVersions = [];
    fileIds = [];
    fileNameHashes = [];

    constructor(id) {
        this.id = id;
    }

    async load() {
        let data = await readGroup(255, this.id);

        let protocol = data.g1();
        if (protocol >= 6) {
            this.version = data.g4();
        }

        let flags = data.g1();
        this.size = data.g2();

        let prevGroupId = 0;
        let maxGroupId = -1;
        for (let i = 0; i < this.size; i++) {
            this.groupIds[i] = prevGroupId += data.g2();

            if (this.groupIds[i] > maxGroupId) {
                maxGroupId = this.groupIds[i];
            }
        }
        this.capacity = maxGroupId + 1;

        if (flags != 0) {
            for (let i = 0; i < this.capacity; i++) {
                this.groupNameHashes[i] = -1;
            }

            for (let i = 0; i < this.size; i++) {
                this.groupNameHashes[i] = data.g4s();
                this.groupNames[i] = KNOWN_HASHES[this.groupNameHashes[i]] || null;
            }
        }

        for (let i = 0; i < this.size; i++) {
            this.groupChecksums[this.groupIds[i]] = data.g4s();
        }

        for (let i = 0; i < this.size; i++) {
            this.groupVersions[this.groupIds[i]] = data.g4();
        }

        for (let i = 0; i < this.size; i++) {
            this.groupSizes[this.groupIds[i]] = data.g2();
        }

        for (let i = 0; i < this.size; i++) {
            let prevFileId = 0;
            let maxFileId = -1;
            let groupId = this.groupIds[i];
            let groupSize = this.groupSizes[groupId];

            this.fileIds[groupId] = [];
            for (let j = 0; j < groupSize; j++) {
                this.fileIds[groupId][j] = prevFileId += data.g2();

                if (this.fileIds[groupId][j] > maxFileId) {
                    maxFileId = this.fileIds[groupId][j];
                }
            }

            this.groupCapacities[groupId] = maxFileId + 1;
        }

        if (flags != 0) {
            for (let i = 0; i < this.size; i++) {
                let groupId = this.groupIds[i];
                let groupSize = this.groupSizes[groupId];

                this.fileNameHashes[groupId] = [];
                for (let j = 0; j < this.groupCapacities[groupId]; j++) {
                    this.fileNameHashes[groupId][j] = -1;
                }

                for (let j = 0; j < groupSize; j++) {
                    let fileId = -1;
                    if (this.fileIds[groupId] === null) {
                        fileId = j;
                    } else {
                        fileId = this.fileIds[groupId][j];
                    }

                    this.fileNameHashes[groupId][fileId] = data.g4s();
                }
            }
        }
    }

    async getGroup(group) {
        return readGroup(this.id, group);
    }
}

export default class Js5MasterIndex {
    archives = [];

    async load() {
        let data = await readGroup(255, 255);

        for (let archive = 0; data.available > 0; archive++) {
            let crc = data.g4();
            let version = data.g4();

            let index = null;
            // if (archive === 16) {
                index = new Js5Index(archive);
                await index.load();
            // }

            this.archives[archive] = { crc, version, index };
        }
    }

    async getArchive(id) {
        if (this.archives[id].index == null) {
            let index = new Js5Index(id);
            await index.load();
            this.archives[id].index = index;
        }

        return this.archives[id].index;
    }
}
