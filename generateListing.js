
const path = require('path');
const fs = require('fs');
const contract = require('truffle-contract');

const isNull = (v) => (v === undefined || v === null);
const isNonNull = (v) => !isNull(v);

const artistsPath = path.join(__dirname, 'artists');

const ignoredFiles = ['.DS_Store'];

const isIgnoredFile = (p) => ignoredFiles.indexOf(p) >= 0;

const kittyCoreAddress = "0x06012c8cf97BEaD5deAe237070F9587f8E7A266d";


async function readJSONFile(path) {
    var obj;
    try {
        const data = fs.readFileSync(path, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        throw err;
    }
}

async function main() {
    const networkId = '1' || process.env.NETWORK_ID;
    const contracts = await loadContracts();
    const categories = require('./categories.json');
    const artists = fs.readdirSync(artistsPath);
    const names = {};
    const displayNames = {};

    const items = {};
    const listing = {};
    const artistListing = {};
    for (var i = 0; i < artists.length; i++) {
        try {
            const manifest = await readJSONFile(path.join(artistsPath, artists[i], 'manifest.json'));
            if (isNull(manifest) || isNull(manifest.artist) || isNull(manifest.artist.name || isNull(manifest.artist.address))) {
                console.warn(new Error(`Manifest does not exist or is not valid for artist ${artistsPath}`));
                continue;                
            }

            if (manifest.listing) {
                console.log(`Adding files for ${manifest.artist.name}...`);
            } else {
                console.warn(new Error(`Manifest item listing is not defined for ${artistsPath}`));
                continue;
            }
            artistListing[manifest.artist.name] = manifest.artist;

            let assets, preview;
            try {
                assets = fs.readdirSync(path.join(artistsPath, artists[i], 'asset'));
                preview = fs.readdirSync(path.join(artistsPath, artists[i], 'preview'));
                if (assets.length === 0 || preview.length === 0) {
                    throw new Error('Assets and / or preview folder is empty.');
                }
            } catch (err) {
                console.warn(new Error(`asset and / or preview folders are missing or empty for ${artists[i]}. Skipping artist.`));
                console.warn(err);
                continue;
            }
            for (const j in manifest.listing) {
                const item = manifest.listing[j];
                const imgName = `${item.image}.svg`;
                const imageDefined = isNonNull(item.image) && fs.existsSync(path.join(artistsPath, artists[i], 'asset', imgName));
                const previewDefined = fs.existsSync(path.join(artistsPath, artists[i], 'preview', imgName));
                const displayNameDefined = isNonNull(item.displayName);
                const addressDefined = isNonNull(item.contract) && isNonNull(contracts[item.contract]) && isNonNull(contracts[item.contract].networks[networkId].address);
                const nameAvaliable = isNull(names[item.image]) && isNull(displayNames[item.displayName]);
                const validCategory = isNonNull(item.category) && isNonNull(categories[item.category])

                if (imageDefined === true && previewDefined === true && displayNameDefined === true && nameAvaliable === true) {
                    console.log(`\t- Copying asset ${item.displayName}`);
                } else {
                    const errs = [`There was an error with file ${item.image} for artist ${artists[i]}`];
                    if (!imageDefined) { errs.push('- Item image is not defined in correctly listing or file does not does not exist in asset folder ')}
                    if (!previewDefined) { errs.push('- Item preview is not correctly defined ')}
                    if (!displayNameDefined) { errs.push('- Item display name not found or not allowed ')}
                    if (!addressDefined) { errs.push(`- Item contract does not exist for the current network`)}
                    if (!nameAvaliable) { errs.push(`- Item name and / or display name already taken`)}
                    if (!validCategory) { errs.push(`- Item category is not defined or invalid`)}
                    console.log("Warning");
                    console.error(new Error(errs.join('\n')));
                    continue;
                }
                const showArtist = !(item.show === false)
                if (isNull(listing[item.category])) {
                    listing[item.category] = { displayName: categories[item.category].displayName, items: [] }
                }
                listing[item.category].items.push({
                    name: item.displayName,
					tokenAddress: contracts[item.contract].networks[networkId].address,
                    artist: artists[i],
                    assetUrl: `${item.image}`,
                    __assetName: item.image,
                    __showArtist: manifest.artist.show
                });
                names[item.image] = true;
                displayNames[item.displayName] = true;
            }
        } catch (err) {
            console.warn(err);
            continue;
        }
    }
    
    await cleanDir(path.join(__dirname, 'build', 'asset'));
    await cleanDir(path.join(__dirname, 'build', 'preview'));
    for (const category in listing) {
        for (const itemIdx in listing[category].items) {
            const catItem = listing[category].items[itemIdx];
            const file = path.join(__dirname, 'artists', catItem.artist, 'asset', `${catItem['__assetName']}.svg`);
            const filePreview = path.join(__dirname, 'artists', catItem.artist, 'preview', `${catItem['__assetName']}.svg`);
            fs.createReadStream(file).pipe(fs.createWriteStream(path.join(__dirname, 'build', 'asset', `${catItem['__assetName']}.svg`)));
            fs.createReadStream(filePreview).pipe(fs.createWriteStream(path.join(__dirname, 'build', 'preview', `${catItem['__assetName']}.svg`)));
            delete catItem['__assetName'];
            if (catItem['__showArtist'] === false) {
                delete catItem['artist'];
            }
            delete catItem['__showArtist'];
        }    
    }    
    const manifestVersion = '1.0.0';
    const marketplaceAddress = contracts['KittyItemMarket'].networks[networkId].address
    fs.writeFileSync(path.join(__dirname, 'build', `listing_${networkId}.json`), JSON.stringify({ 
        version: manifestVersion,
        networkId: networkId,
        marketplaceAddress,
        kittyCoreAddress: kittyCoreAddress,
        categories: listing 
    }, null, '\t'));
    fs.writeFileSync(path.join(__dirname, 'build', `artists.json`), JSON.stringify({
        version: manifestVersion, artists: artistListing 
    }, null, '\t'));
    return 1;
}
    
    
async function cleanDir(dir) {
    const directory = dir;
    try {
        const files = fs.readdirSync(directory)
        for (const file of files) {
            try {
                fs.unlinkSync(path.join(directory, file));
            } catch (err) {
                throw err;
            }
        }
    } catch (err) {
        if (err) throw err;
    }
}


async function loadContracts() {
    const result = {};
    const contractsDir = path.join(__dirname, 'kitty-hats-contracts');
    const files = fs.readdirSync(contractsDir);
    for (file of files) {
        if (file === '.git') {
            continue;
        }
        const name = file.split('.')[0];
        const contents = await readJSONFile(path.join(contractsDir, file));
        result[name] = contract(contents);
    }
    return result;
}

main()
.then(console.log)
.catch(console.error);
