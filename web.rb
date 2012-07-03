require 'sinatra'
require_relative 'data/DataLoader.rb'
require 'json'

set :public, 'public'
set :public_folder, 'public'

get '/' do
  send_file('public/index.html')
end

get '/regions' do
  provs = {"48" => "AB", "59" => "BC", "46" => "MB", "13" => "NB", "10" => "NL", "61" => "NT", "12" => "NS", "62" => "NU", "35" => "ON", "11" => "PE", "24" => "QC", "47" => "SK", "60" => "YT"}
  region_totals = DataLoader.region_totals()
  attribs = DataLoader.buildDictionary()
  
  output = []
  regions = attribs['geo']
  regions.each_key do |key| 
    name = regions[key]
    if key.length > 2
      
      p_key = key[0,2]
      prov = provs[p_key]
      if prov.nil? 
        return 'p_key=' + p_key + ' key=' + key
      end
      name = name + ", " + prov 
    end 
    population = region_totals[key]
    output = output + [{:name => name, :id => key, :population => population}]
  end
  
  output = output.sort { |x,y| y[:population] <=> x[:population] }
  
  JSON.dump(output)  
end

get '/region/:region_id' do
  @region_id = params[:region_id]
  puts @region_id
  erb :population_pyramid
  #send_file('public/population_pyramid.html')
end

get '/region/:region_id/data.json' do
  region_id = params[:region_id]
  
  regions = DataLoader.regions()
  #regions = DataLoader.loadData()
  
  region = regions[region_id]
  puts region
  #region = DataLoader.region(region_id)
  JSON.dump(region)
end
