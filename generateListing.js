
const path = require('path');
const fs = require('fs');
const contract = require('truffle-contract');

const isNull = (v) => (v === undefined || v === null);
const isNonNull = (v) => !isNull(v);

const artistsPath = path.join(__dirname, 'artists');

const ignoredFiles = ['.DS_Store'];

const isIgnoredFile = (p) => ignoredFiles.indexOf(p) >= 0;

const kittyCoreAddress = "0x06012c8cf97BEaD5deAe237070F9587f8E7A266d";
const topHatAddress = "0xcd1b3ecffeacdcfc01054848225eb627bc9c590f";

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
    const networks = [
        '1',
        '3', 
        '5777'
    ];

    const contracts = await loadContracts();
    const categories = require('./categories.json');
    const artists = fs.readdirSync(artistsPath);
        
    await cleanDir(path.join(__dirname, 'build', 'asset'));
    await cleanDir(path.join(__dirname, 'build', 'preview'));

    for (networkId of networks) {
        console.log(`${'#'.repeat(80)}\nBuilding listing for Network ID: ${networkId}\n${'#'.repeat(80)}`);
        const names = {};
        const displayNames = {};
    
        const items = {};
        const listing = {};
        let artistListing = {};
        for (var i = 0; i < artists.length; i++) {
            const isDada = artists[i] === 'dada';
            if (artists[i] === '.DS_Store') {
                continue;
            }
            try {
                console.log(`${'-'.repeat(80)}\nChecking manifest for ${artists[i]}...`);
                const manifest = await readJSONFile(path.join(artistsPath, artists[i], 'manifest.json'));

                if (isNull(manifest)) {
                    console.error(new Error(`Manifest does not exist for artist ${artists[i]}`));
                    continue;                
                }
                
                if (isNull(manifest.artist) && isNull(manifest.artists)) {
                    console.error(new Error(`Manifest does contain artist entry for ${artists[i]}`));
                    continue;
                }
                if (!isDada && isNull(manifest.artist.address)) {
                    console.error(new Error(`Manifest does contain artist address for ${artists[i]}`));
                    continue;
                }
    
                if (manifest.listing) {
                    console.log(`Adding files for ${artists[i]}...`);
                } else {
                    console.warn(new Error(`Manifest item listing is not defined for ${artistsPath}`));
                    continue;
                }
                if (isDada) {
                    artistListing = {
                        ...artistListing,
                        ...manifest.artists
                    }
                } else {
                    artistListing[manifest.artist.name] = manifest.artist;
                }
                
    
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
                    const imgName = item.category === 'dada' ? `${item.image}.png` : `${item.image}.svg`;
                    const imageDefined = isNonNull(item.image) && fs.existsSync(path.join(artistsPath, artists[i], 'asset', imgName));
                    const previewDefined = fs.existsSync(path.join(artistsPath, artists[i], 'preview', imgName));
                    const displayNameDefined = isNonNull(item.displayName);
                    const addressDefined = (isNonNull(item.contract) 
                        && isNonNull(contracts[item.contract]) 
                        && isNonNull(contracts[item.contract].networks[networkId])
                        && isNonNull(contracts[item.contract].networks[networkId].address)
                    );
                    const nameAvaliable = isNull(names[item.image]) && isNull(displayNames[item.displayName]);
                    const validCategory = isNonNull(item.category) && isNonNull(categories[item.category])
    
                    if ( (networkId === '5777' || addressDefined === true) && imageDefined === true && previewDefined === true && displayNameDefined === true && nameAvaliable === true) {
                        console.log(`\t- Copying asset ${item.displayName}`);
                    } else {
                        const errs = [`There was an error with file ${item.image} for artist ${artists[i]}`];
                        if (!imageDefined) { errs.push('- Item image is not defined in correctly listing or file does not does not exist in asset folder ')}
                        if (!previewDefined) { errs.push('- Item preview is not correctly defined ')}
                        if (!displayNameDefined) { errs.push('- Item display name not found or not allowed ')}
                        if (!addressDefined) { errs.push(`- Item contract does not exist for the current network`)}
                        if (!nameAvaliable) { errs.push(`- Item name and / or display name already taken`)}
                        if (!validCategory) { errs.push(`- Item category is not defined or invalid`)}
                        console.error(new Error(errs.join('\n')));
                        continue;
                    }
                    const showArtist = !(item.show === false)
                    if (isNull(listing[item.category])) {
                        listing[item.category] = {
                            displayName: categories[item.category].displayName,
                            items: [],
                            order: categories[item.category].order
                        }
                    }
                    const newItem = {
                        name: item.displayName,
                        contract: item.contract,
                        // Since we're on the mainnet, when using dev listing we're just going to use the address of the tophat
                        tokenAddress: networkId === '5777' ? topHatAddress : contracts[item.contract].networks[networkId].address,
                        artist: isDada ? item.artist : artists[i],
                        charity: item.charity ? item.charity : undefined,
                        image: item.image,
                        assetUrl: imgName,
                        __assetName: imgName,
                        __showArtist: manifest.artist.show
                    };
                    if (item.url) newItem.url = item.url;
                    listing[item.category].items.push(newItem);
                    names[item.image.split('.')[0]] = true;
                    displayNames[item.displayName] = true;
                }
            } catch (err) {
                console.warn(err);
                continue;
            }
        }

        for (const category in listing) {
            for (const itemIdx in listing[category].items) {
                const catItem = listing[category].items[itemIdx];
                const artistFolder = category === 'dada' ? category : catItem.artist;
                const file = path.join(__dirname, 'artists', artistFolder, 'asset', `${catItem['__assetName']}`);
                const filePreview = path.join(__dirname, 'artists', artistFolder, 'preview', `${catItem['__assetName']}`);
                fs.createReadStream(file).pipe(fs.createWriteStream(path.join(__dirname, 'build', 'asset', `${catItem['__assetName']}`)));
                fs.createReadStream(filePreview).pipe(fs.createWriteStream(path.join(__dirname, 'build', 'preview', `${catItem['__assetName']}`)));

                if (category === 'dada') {
                    const placardFileName = catItem['__assetName'].replace('.png', '.svg').replace('dada-', 'dada-placard-');
                    const filePlacard = path.join(__dirname, 'artists', artistFolder, 'asset', `${placardFileName}`);
                    fs.createReadStream(filePlacard).pipe(fs.createWriteStream(path.join(__dirname, 'build', 'asset', placardFileName)));
                }
                delete catItem['__assetName'];

                catItem['assetUrl'] = catItem['image']
                delete catItem['image'];
                if (catItem['__showArtist'] === false) {
                    delete catItem['artist'];
                }
                delete catItem['__showArtist'];
            }

            // Copy over the easel
            if (category === 'dada') {
                const fileEasel = path.join(__dirname, 'artists/dada', 'asset', `easel.svg`);
                fs.createReadStream(fileEasel).pipe(fs.createWriteStream(path.join(__dirname, 'build', 'asset', `easel.svg`)));
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
    }
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
        if (file === '.git' ||  file === 'sync.sh') {
            continue;
        }
        const name = file.split('.')[0];
        const contents = await readJSONFile(path.join(contractsDir, file));
        result[name] = contract(contents);
    }
    return result;
}

main()
.catch(console.error);
