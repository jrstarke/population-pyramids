require 'nokogiri'
require 'json'

module DataLoader
  @@regions = nil
  @@region_totals = nil
  @@attribs = nil
   
  def self.loadData()
    if @@regions.nil? or @@region_totals.nil?
      unless File.exist? "regions.json" and File.exist? "region_totals.json"
        @@regions, @@region_totals = self.loadRegions()
        
        File.open('regions.json', 'w') {|f| f.write(JSON.dump(@@regions)) }
        File.open('region_totals.json', 'w') {|f| f.write(JSON.dump(@@region_totals)) }
        return @@regions, @@region_totals
      else
        file = File.open('regions.json').read
        @@regions = JSON.parse(file)
        
        file = File.open('region_totals.json').read
        @@region_totals = JSON.parse(file)
        
        return @@regions, @@region_totals
      end
    else
      return @@regions, @@region_totals    
    end
  end
  
  def self.regions()
    if @@regions.nil?
      loadData()
    end
    
    return @@regions
  end
  
  def self.region_totals()
    if @@region_totals.nil?
      loadData()
    end
    
    return @@region_totals
  end
  
  def self.attribs()
    if @@attribs.nil?
      unless File.exist? "attributes.json"
        @@attribs = self.buildDictionary()
        
        File.open('attributes.json', 'w') {|f| f.write(JSON.dump(@@attribs)) }
        return @@attribs
      else
        file = File.open('attributes.json').read
        @@attribs = JSON.parse(file)
        return @@attribs
      end
    else
      return @@attribs    
    end
  end  
  
  def self.region(wanted_region_id)
    attrib = attribs()
    
    puts "Starting load"
    doc = Nokogiri::XML::Reader(File.open("data/Generic_98-311-XCB2011023.xml"))
    puts "File handle loaded"
    puts "Beginning parse"
    
    hash_maker = proc do |h, k|
      h[k] = Hash.new(&hash_maker)
    end
    
    region = Hash.new(&hash_maker)
    
    region_total = nil
    
    element = nil
    
    doc.each do |node|
      
      if node.name == "generic:Series"
        
        if node.node_type == Nokogiri::XML::Reader::TYPE_ELEMENT
          element = {}
        
        elsif element and node.node_type == Nokogiri::XML::Reader::TYPE_END_ELEMENT
          if element.include? 'age'
            region_id = element['region_id']
            age = element['age']
            sex = element['sex']
            people = element['value']
            
            if age == 'total'
              region_total = people.to_f
            else
              region[age]['age'] = age
              region[age][sex] = {'people' => people}
               
              total = region_total
              if total
                percent = (people.to_f / total) * 100
                region[age][sex]['percentOfTotal'] = percent   
              end
            end
            element = nil
            #print '.'
          end  
        end
        
      elsif element and node.name == "generic:Value"
        
        if node.node_type == Nokogiri::XML::Reader::TYPE_ELEMENT
          
          if node.attribute("concept") == "GEO"
            
            region_id = node.attribute("value")
            if region_id == wanted_region_id
              element["region_id"] = region_id
              element["region"] = attrib["geo"][region_id]
            else
              element = nil
            end   
            
          elsif node.attribute("concept") == "AGE"
            
            age_id = node.attribute("value")
            age = attrib["age"][age_id]
            age = age.gsub("Total - Age","total")
            age = age.gsub("Under 1 year","<1")
            age = age.gsub("100 years and over","100+")
            
            if /^\d*$|total|\<1|100\+/.match(age)
              element["age"] = age
            end  
          
          elsif node.attribute('concept') == 'Sex'
            
            sex_id = node.attribute('value')
            element['sex'] = attrib['sex'][sex_id].downcase.sub(" - sex",'') 
            
          end  
        end
        
      elsif element and node.name == 'generic:ObsValue'
        
        element['value'] = node.attribute('value')
      
      end
      
    end
 
    formatted_region = region.values
    
    return formatted_region
  end
  
  def self.loadRegions()
    attrib = attribs()
    
    puts "Starting load"
    doc = Nokogiri::XML::Reader(File.open("data/Generic_98-311-XCB2011023.xml"))
    puts "File handle loaded"
    puts "Beginning parse"
    
    hash_maker = proc do |h, k|
      h[k] = Hash.new(&hash_maker)
    end
    
    regions = Hash.new(&hash_maker)
    
    region_total = {}
    
    element = nil
    
    doc.each do |node|
      if node.name == "generic:Series"
        
        if node.node_type == Nokogiri::XML::Reader::TYPE_ELEMENT
          element = {}
        
        elsif node.node_type == Nokogiri::XML::Reader::TYPE_END_ELEMENT
          if element.include? 'age'
            region_id = element['region_id']
            age = element['age']
            sex = element['sex']
            people = element['value']
            
            if age == 'total'
              region_total[region_id] = people.to_f
            else
              regions[region_id][age]['age'] = age
              regions[region_id][age][sex] = {'people' => people}
               
              total = region_total[region_id]
              if total
                percent = (people.to_f / total) * 100
                regions[region_id][age][sex]['percentOfTotal'] = percent   
              end
            end
            #print '.'
          end  
        end
        
      elsif node.name == "generic:Value"
        
        if node.node_type == Nokogiri::XML::Reader::TYPE_ELEMENT
          
          if node.attribute("concept") == "GEO"
            
            region_id = node.attribute("value")
            element["region_id"] = region_id
            element["region"] = attrib["geo"][region_id]
            
          elsif node.attribute("concept") == "AGE"
            
            age_id = node.attribute("value")
            age = attrib["age"][age_id]
            age = age.gsub("Total - Age","total")
            age = age.gsub("Under 1 year","<1")
            age = age.gsub("100 years and over","100+")
            
            if /^\d*$|total|\<1|100\+/.match(age)
              element["age"] = age
            end  
          
          elsif node.attribute('concept') == 'Sex'
            
            sex_id = node.attribute('value')
            element['sex'] = attrib['sex'][sex_id].downcase.sub(" - sex",'') 
            
          end  
        end
        
      elsif node.name == 'generic:ObsValue'
        
        element['value'] = node.attribute('value')
      
      end
      
    end
 
    formatted_regions = {}
    regions.each_key do |region_id|
      formatted_regions[region_id] = regions[region_id].values
    end
    
    return formatted_regions, region_total
  end
  
  def self.buildDictionary(language = "en")
    dict = {}
    doc = Nokogiri::XML(File.open("data/Structure_98-311-XCB2011023.xml"))
    doc.remove_namespaces!
    
    doc.css('CodeList').each do |codeList|
      id = codeList[:id]
      id = id.gsub("CL_","").downcase
      
      codeListDict = {}
      codeList.css('Code').each do |code|
        value = code[:value]
        
        codeDesc = nil
        
        geo_type = ''
        title = code.css('AnnotationTitle').first
        if title
          geo_type = ' (' + title.content.strip + ')'
        end
        
        code.xpath('Description').each do |desc|
          lang = desc[:lang]
          
          if lang 
            if lang == language
              codeDesc = desc.content.strip + geo_type
            end  
          else
            codeDesc = desc.content.strip + geo_type
          end
        end
        codeListDict[value] = codeDesc     
      end        
      dict[id] = codeListDict
      break
    end
    return dict 
  end   
end

def precomputeRegionsFile()
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
  
  File.open('public/regions.json', 'w') {|f| f.write(JSON.dump(output)) }
end

def precomputeRegions()
  regions = DataLoader.regions()
  
  regions.each_key do |key|
    region = regions[key]
    
    File.open('public/region/' + key + '.json', 'w') {|f| f.write(JSON.dump(region)) }
  end
end

if __FILE__ == $0
  #listings = DataLoader.loadData()
  #puts listings.length

  DataLoader.attribs()

  #precomputeRegionsFile()
  #precomputeRegions()
  #puts DataLoader.findAttributeValueForKey("sex","1")
end
