# kitty-hats-manifest

![alt text](https://travis-ci.org/achadha235/kitty-hats-manifest.svg?branch=master "Logo Title Text 1")

The manifest serves as the central repository for listing artists and items and assoicated metadata.

## Adding a new item for an existing artist (internal)

Suppose KittyHawk makes a new item and we want to add it to the repo.

1. Get `@jordan` to make you a contract and send you the JSON. Follow instructions on `kitty-hats-contracts` repo to add your new contract.
2. Find the folder for the artist and open manifest file
3. Place the item asset and preview in the appropriate folders
4. Add an entry for the new item

```
{
	"image": "bowtie",
	"contract": "ItemBowtie",
	"category": "accessories",
	"displayName": "Bowtie",
    "charity": "Pussyhats.org"
}

```

## Adding a new item for an external artist


0. Get the artist to update their repo
1. Should be as simple as running `git submodule update --recursive` for artists with external repos.


## Adding a new artist

New artists need to provide a public repository URL with a repository structure matching the `artists/KittyHawk` folder. Must have an `asset` and `preview` folder with a well-defined `manifest.json`.

2. Ensure that the artist's repository meets the requirements for KittyHats
3. Inside the repo folder, add the artists repository as a submodule 
	`git submodule add <GIT_REPO_URL> --path ./artists/<ARTIST_NAME>`
    
    This will clone the repository and update the artists folder.



