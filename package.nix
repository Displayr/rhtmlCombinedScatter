{ pkgs ? import <nixpkgs> {}, displayrUtils }:

pkgs.rPackages.buildRPackage {
  name = "rhtmlCombinedScatter";
  version = displayrUtils.extractRVersion (builtins.readFile ./DESCRIPTION); 
  src = ./.;
  description = ''An HTML widget that creates a labeled scatter plot.'';
  propagatedBuildInputs = with pkgs.rPackages; [ 
    htmlwidgets
    jsonlite
  ];
}
